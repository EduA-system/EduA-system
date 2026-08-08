package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.domain.model.practiceexam.PracticeExamValidation;
import com.edua.beeduasystem.domain.exception.PracticeExamGenerationException;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.PracticeExamEvent;
import com.edua.beeduasystem.repository.gateways.PracticeExamStreamPort;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class PracticeExamService {
    private static final Set<String> TYPES = Set.of("MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY");
    private static final Pattern DISPLAY_MATH = Pattern.compile("\\$\\$([\\s\\S]+?)\\$\\$");
    private static final Pattern INLINE_MATH = Pattern.compile("(?<!\\$)\\$([^$\\n]+?)\\$(?!\\$)");
    private final TextbookCatalogRepository catalogRepository;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final int maxConcurrency;
    private final long regularBatchTimeoutSeconds;
    private final long essayBatchTimeoutSeconds;
    private final long totalTimeoutSeconds;

    public PracticeExamService(TextbookCatalogRepository catalogRepository,
                               @Qualifier("practiceExamAiClient") AiClient aiClient, ObjectMapper objectMapper,
                               @Value("${app.ai.practice-exam.max-concurrency:4}") int maxConcurrency,
                               @Value("${app.ai.practice-exam.timeout.regular-seconds:60}") long regularBatchTimeoutSeconds,
                               @Value("${app.ai.practice-exam.timeout.essay-seconds:90}") long essayBatchTimeoutSeconds,
                               @Value("${app.ai.practice-exam.timeout.total-seconds:240}") long totalTimeoutSeconds) {
        this.catalogRepository = catalogRepository;
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
        this.maxConcurrency = Math.max(1, maxConcurrency);
        this.regularBatchTimeoutSeconds = Math.max(1, regularBatchTimeoutSeconds);
        this.essayBatchTimeoutSeconds = Math.max(1, essayBatchTimeoutSeconds);
        this.totalTimeoutSeconds = Math.max(1, totalTimeoutSeconds);
    }

    public PracticeExamValidation validate(PracticeExamRequest request) {
        validateStructure(request);
        return feasibility(request);
    }

    public PracticeExam generate(PracticeExamRequest request) {
        PracticeExamValidation validation = validate(request);
        log.info("PRACTICE_EXAM_GENERATION_STARTED subject={} grade={} durationMinutes={} difficulty={} questionCount={} lessonCount={} validationStatus={}",
                request.subject(), request.grade(), request.durationMinutes(), request.difficulty(), request.totalQuestionCount(),
                request.knowledgeScope().lessonRefs().size(), validation.status());
        if ("INFEASIBLE".equals(validation.status())) throw new IllegalArgumentException(validation.message());
        if ("WARNING".equals(validation.status()) && !Boolean.TRUE.equals(request.teacherConfirmedWarning())) {
            throw new IllegalArgumentException("Cấu hình cần xác nhận vì thời lượng ước tính quá sát thời gian làm bài.");
        }
        Map<String, String> knowledge = loadKnowledge(request);
        log.info("PRACTICE_EXAM_KNOWLEDGE_LOADED lessonCount={} characters={}", knowledge.size(),
                knowledge.values().stream().mapToInt(String::length).sum());
        return generateInBatches(request, knowledge);
    }

    /**
     * Sinh đề kiểm tra theo kiểu STREAMING: trả tiến trình qua {@link PracticeExamStreamPort}
     * thay vì chờ toàn bộ rồi trả 1 lần. Khác {@link #generate(PracticeExamRequest)}: KHÔNG
     * cascade-cancel khi 1 batch lỗi — mỗi batch chạy độc lập, câu nào lỗi chỉ mình câu đó
     * bị đánh dấu "Thử lại", các câu khác vẫn tiếp tục/giữ nguyên. Dùng lại nguyên
     * {@link #generateBatch} (prompt, retry, sửa LaTeX) — chỉ khác cách điều phối kết quả.
     */
    public void generateStreaming(PracticeExamRequest request, String sessionId, PracticeExamStreamPort stream) {
        PracticeExamValidation validation;
        try {
            validation = validate(request);
        } catch (IllegalArgumentException exception) {
            stream.publishFailed(sessionId, exception.getMessage());
            return;
        }
        log.info("PRACTICE_EXAM_STREAM_STARTED sessionId={} subject={} grade={} questionCount={} validationStatus={}",
                sessionId, request.subject(), request.grade(), request.totalQuestionCount(), validation.status());
        if ("INFEASIBLE".equals(validation.status())) {
            stream.publishFailed(sessionId, validation.message());
            return;
        }
        if ("WARNING".equals(validation.status()) && !Boolean.TRUE.equals(request.teacherConfirmedWarning())) {
            stream.publishFailed(sessionId, "Cấu hình cần xác nhận vì thời lượng ước tính quá sát thời gian làm bài.");
            return;
        }
        Map<String, String> knowledge;
        try {
            knowledge = loadKnowledge(request);
        } catch (IllegalArgumentException exception) {
            stream.publishFailed(sessionId, exception.getMessage());
            return;
        }
        List<BatchTask> tasks = buildBatchTasks(request);
        stream.publishPlanReady(sessionId, request.title(), "Đọc kỹ từng câu hỏi và trình bày bài làm rõ ràng.",
                request.durationMinutes(), request.totalScoreCentiPoints(), expandStubs(tasks));

        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        Semaphore permits = new Semaphore(Math.min(maxConcurrency, Math.max(1, tasks.size())));
        AtomicBoolean cancelled = new AtomicBoolean(false);
        AtomicInteger successCount = new AtomicInteger();
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        try {
            for (BatchTask task : tasks) {
                futures.add(CompletableFuture.runAsync(() -> {
                    boolean acquired = false;
                    try {
                        permits.acquire();
                        acquired = true;
                        List<PracticeExam.Question> questions = generateBatch(request, knowledge, task, cancelled);
                        successCount.incrementAndGet();
                        stream.publishBatchReady(sessionId, questions);
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                    } catch (Exception exception) {
                        log.warn("PRACTICE_EXAM_STREAM_BATCH_FAILED sessionId={} type={} firstOrder={} message={}",
                                sessionId, task.type().type(), task.firstOrder(), exception.getMessage());
                        stream.publishBatchFailed(sessionId, orderRange(task), rootMessage(exception));
                    } finally {
                        if (acquired) permits.release();
                    }
                }, executor));
            }
            try {
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).get(totalTimeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException exception) {
                cancelled.set(true);
                futures.forEach(future -> future.cancel(true));
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                cancelled.set(true);
            } catch (ExecutionException exception) {
                log.error("PRACTICE_EXAM_STREAM_UNEXPECTED sessionId={}", sessionId, exception);
            }
        } finally {
            executor.shutdownNow();
        }
        if (successCount.get() == 0) {
            stream.publishFailed(sessionId, "AI không tạo được câu hỏi nào cho đề này. Vui lòng thử lại.");
            return;
        }
        log.info("PRACTICE_EXAM_STREAM_DONE sessionId={} successBatches={}/{}", sessionId, successCount.get(), tasks.size());
        stream.publishDone(sessionId);
    }

    /** Sinh lại ĐÚNG MỘT câu hỏi (nút "Thử lại" trên 1 câu lỗi) — tái dùng {@link #generateBatch} với batch giả 1 câu. */
    public PracticeExam.Question regenerateQuestion(PracticeExamRequest request, int order, String type, int scoreCentiPoints) {
        if (!TYPES.contains(type)) throw new IllegalArgumentException("Loại câu hỏi không hợp lệ.");
        Map<String, String> knowledge = loadKnowledge(request);
        PracticeExamRequest.QuestionType questionType = new PracticeExamRequest.QuestionType(
                type, 1, scoreCentiPoints, "TRUE_FALSE".equals(type) ? 4 : null);
        BatchTask task = new BatchTask(questionType, 0, 1, scoreCentiPoints, order);
        try {
            return generateBatch(request, knowledge, task, new AtomicBoolean(false)).get(0);
        } catch (PracticeExamGenerationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo lại được câu hỏi này. Vui lòng thử lại.", exception);
        }
    }

    private List<PracticeExamEvent.QuestionStub> expandStubs(List<BatchTask> tasks) {
        List<PracticeExamEvent.QuestionStub> stubs = new ArrayList<>();
        for (BatchTask task : tasks) {
            for (int index = 0; index < task.batchCount(); index++) {
                int score = proportionalScore(task.batchScore(), task.batchCount(), index, 1);
                stubs.add(new PracticeExamEvent.QuestionStub(task.firstOrder() + index, task.type().type(), score));
            }
        }
        return stubs;
    }

    private static List<Integer> orderRange(BatchTask task) {
        List<Integer> orders = new ArrayList<>(task.batchCount());
        for (int index = 0; index < task.batchCount(); index++) orders.add(task.firstOrder() + index);
        return orders;
    }

    private static String rootMessage(Throwable exception) {
        Throwable cause = exception;
        while (cause.getCause() != null && cause.getCause() != cause) cause = cause.getCause();
        return cause.getMessage() != null ? cause.getMessage() : cause.toString();
    }

    private PracticeExam generateInBatches(PracticeExamRequest request, Map<String, String> knowledge) {
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        AtomicBoolean cancelled = new AtomicBoolean(false);
        List<CompletableFuture<BatchResult>> futures = new ArrayList<>();
        try {
            List<BatchTask> tasks = buildBatchTasks(request);
            Semaphore permits = new Semaphore(Math.min(maxConcurrency, Math.max(1, tasks.size())));
            log.info("PRACTICE_EXAM_BATCH_PLAN_READY batchCount={} maxConcurrency={} regularTimeoutSeconds={} essayTimeoutSeconds={} totalTimeoutSeconds={}",
                    tasks.size(), maxConcurrency, regularBatchTimeoutSeconds, essayBatchTimeoutSeconds, totalTimeoutSeconds);
            for (BatchTask task : tasks) {
                futures.add(CompletableFuture.supplyAsync(() -> runBatchTask(request, knowledge, task, permits, cancelled), executor));
            }
            List<BatchResult> results = collectBatchResults(futures, cancelled);
            List<PracticeExam.Question> questions = results.stream()
                    .sorted(Comparator.comparingInt(BatchResult::firstOrder))
                    .flatMap(result -> result.questions().stream())
                    .toList();
            PracticeExam exam = new PracticeExam(request.title(), "Đọc kỹ từng câu hỏi và trình bày bài làm rõ ràng.",
                    request.durationMinutes(), request.totalScoreCentiPoints(), questions);
            validateCompletedExam(exam, request);
            log.info("PRACTICE_EXAM_GENERATION_SUCCEEDED generatedQuestionCount={}", exam.questions().size());
            return exam;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (PracticeExamGenerationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo được đề đúng cấu trúc. Vui lòng thử lại.", exception);
        } finally {
            cancelled.set(true);
            executor.shutdownNow();
        }
    }

    private List<BatchResult> collectBatchResults(List<CompletableFuture<BatchResult>> futures, AtomicBoolean cancelled) {
        BlockingQueue<CompletableFuture<BatchResult>> completed = new LinkedBlockingQueue<>();
        futures.forEach(future -> future.whenComplete((ignored, error) -> completed.add(future)));
        List<BatchResult> results = new ArrayList<>();
        long deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(totalTimeoutSeconds);
        for (int remaining = futures.size(); remaining > 0; remaining--) {
            CompletableFuture<BatchResult> future;
            try {
                long waitNanos = deadlineNanos - System.nanoTime();
                if (waitNanos <= 0) {
                    cancelRemaining(futures, cancelled);
                    throw new PracticeExamGenerationException("AI mất quá " + totalTimeoutSeconds + " giây để tạo đề. Vui lòng giảm số bài SGK hoặc thử lại.", null);
                }
                future = completed.poll(waitNanos, TimeUnit.NANOSECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                cancelRemaining(futures, cancelled);
                throw new PracticeExamGenerationException("Quá trình tạo đề đã bị hủy.", exception);
            }
            if (future == null) {
                cancelRemaining(futures, cancelled);
                throw new PracticeExamGenerationException("AI mất quá " + totalTimeoutSeconds + " giây để tạo đề. Vui lòng giảm số bài SGK hoặc thử lại.", null);
            }
            try {
                results.add(future.join());
            } catch (CompletionException | CancellationException exception) {
                cancelRemaining(futures, cancelled);
                throw unwrapGenerationFailure(exception);
            }
        }
        return results;
    }

    private void cancelRemaining(List<CompletableFuture<BatchResult>> futures, AtomicBoolean cancelled) {
        cancelled.set(true);
        futures.forEach(future -> {
            if (!future.isDone()) future.cancel(true);
        });
    }

    private List<BatchTask> buildBatchTasks(PracticeExamRequest request) {
        List<BatchTask> tasks = new ArrayList<>();
        int firstOrder = 1;
        for (PracticeExamRequest.QuestionType type : request.questionTypes()) {
            int batchLimit = batchLimit(type.type());
            for (int offset = 0; offset < type.questionCount(); offset += batchLimit) {
                int batchCount = Math.min(batchLimit, type.questionCount() - offset);
                int batchScore = proportionalScore(type.totalScoreCentiPoints(), type.questionCount(), offset, batchCount);
                tasks.add(new BatchTask(type, offset, batchCount, batchScore, firstOrder));
                firstOrder += batchCount;
            }
        }
        return tasks;
    }

    private int batchLimit(String type) {
        return switch (type) {
            case "MULTIPLE_CHOICE" -> 5;
            case "TRUE_FALSE" -> 2;
            case "SHORT_ANSWER" -> 3;
            case "ESSAY" -> 1;
            default -> 3;
        };
    }

    private BatchResult runBatchTask(PracticeExamRequest request, Map<String, String> knowledge, BatchTask task,
                                     Semaphore permits, AtomicBoolean cancelled) {
        boolean acquired = false;
        try {
            if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
            permits.acquire();
            acquired = true;
            if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
            List<PracticeExam.Question> questions = generateBatch(request, knowledge, task, cancelled);
            return new BatchResult(task.firstOrder(), questions);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PracticeExamGenerationException("Quá trình tạo đề đã bị hủy.", exception);
        } catch (PracticeExamGenerationException | CancellationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo được đề đúng cấu trúc. Vui lòng thử lại.", exception);
        } finally {
            if (acquired) permits.release();
        }
    }

    private List<PracticeExam.Question> generateBatch(PracticeExamRequest request, Map<String, String> knowledge,
                                                      BatchTask task, AtomicBoolean cancelled) throws Exception {
        Exception lastFailure = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
                if (attempt > 0) backoffBeforeRetry(attempt);
                log.info("PRACTICE_EXAM_AI_BATCH_STARTED type={} offset={} count={} score={} attempt={} compactRetry={}",
                        task.type().type(), task.offset(), task.batchCount(), task.batchScore(), attempt + 1, attempt > 0);
                String raw = generateWithTimeout(batchPrompt(request, knowledge, task.type(), task.batchCount(), task.batchScore(), attempt > 0),
                        timeoutSeconds(task.type().type()));
                log.info("PRACTICE_EXAM_AI_RESPONSE_RECEIVED type={} offset={} attempt={} characters={} fenced={}", task.type().type(),
                        task.offset(), attempt + 1, raw == null ? 0 : raw.length(), raw != null && raw.trim().startsWith("```"));
                List<PracticeExam.Question> generated = objectMapper.readValue(stripFence(raw), new TypeReference<>() {});
                if (generated.size() != task.batchCount()) throw new IllegalArgumentException("AI trả sai số lượng câu trong một lô.");
                List<PracticeExam.Question> normalized = new ArrayList<>();
                for (int index = 0; index < generated.size(); index++) {
                    PracticeExam.Question question = generated.get(index);
                    if (question == null || !task.type().type().equals(question.type())) {
                        throw new IllegalArgumentException("AI trả sai loại câu hỏi trong một lô.");
                    }
                    int score = proportionalScore(task.batchScore(), task.batchCount(), index, 1);
                    PracticeExam.Question normalizedQuestion = new PracticeExam.Question(task.firstOrder() + index, question.type(),
                            repairMathText(question.content()), repairOptions(question.options()),
                            repairAnswer(question.answer()), repairMathText(question.explanation()), score,
                            repairRubric(question.rubric()), question.sourceLessonRefs());
                    validateQuestionStructure(normalizedQuestion);
                    normalized.add(normalizedQuestion);
                }
                return normalized;
            } catch (CancellationException failure) {
                throw failure;
            } catch (InterruptedException failure) {
                Thread.currentThread().interrupt();
                throw failure;
            } catch (Exception failure) {
                lastFailure = failure;
                log.warn("PRACTICE_EXAM_AI_BATCH_FAILED type={} offset={} attempt={} failureType={} message={}", task.type().type(), task.offset(),
                        attempt + 1, failure.getClass().getSimpleName(), failure.getMessage());
            }
        }
        throw lastFailure == null ? new IllegalStateException("AI không trả kết quả cho một lô câu hỏi.") : lastFailure;
    }


    private String generateWithTimeout(String prompt, long timeoutSeconds) throws Exception {
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            return executor.submit(() -> aiClient.generate(prompt)).get(timeoutSeconds, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }
    }

    private long timeoutSeconds(String type) {
        return "ESSAY".equals(type) ? essayBatchTimeoutSeconds : regularBatchTimeoutSeconds;
    }

    private void backoffBeforeRetry(int attempt) throws InterruptedException {
        long minMillis = attempt <= 1 ? 500 : 1_500;
        long maxMillis = attempt <= 1 ? 2_000 : 4_000;
        Thread.sleep(ThreadLocalRandom.current().nextLong(minMillis, maxMillis + 1));
    }

    private PracticeExamGenerationException unwrapGenerationFailure(Throwable exception) {
        Throwable cause = exception instanceof CompletionException ? exception.getCause() : exception;
        if (cause instanceof CompletionException completionException && completionException.getCause() != null) {
            cause = completionException.getCause();
        }
        if (cause instanceof PracticeExamGenerationException generationException) {
            return generationException;
        }
        if (cause instanceof RuntimeException runtimeException && runtimeException.getCause() instanceof PracticeExamGenerationException generationException) {
            return generationException;
        }
        return new PracticeExamGenerationException("AI không tạo được đề đúng cấu trúc. Vui lòng thử lại.", cause);
    }

    private void validateStructure(PracticeExamRequest request) {
        if (request == null || blank(request.subject()) || request.grade() == null || request.grade() < 1 || request.durationMinutes() == null || request.durationMinutes() <= 0 || request.durationMinutes() > 90) throw new IllegalArgumentException("Thời lượng đề phải từ 1 đến 90 phút.");
        if (!Set.of("EASY", "MEDIUM", "HARD").contains(request.difficulty())) throw new IllegalArgumentException("Mức độ đề không hợp lệ.");
        if (request.questionTypes() == null || request.questionTypes().isEmpty()) throw new IllegalArgumentException("Cần chọn ít nhất một dạng câu hỏi.");
        int count = 0; int score = 0;
        for (PracticeExamRequest.QuestionType type : request.questionTypes()) {
            if (type == null || !TYPES.contains(type.type()) || type.questionCount() == null || type.questionCount() < 0 || type.totalScoreCentiPoints() == null || type.totalScoreCentiPoints() < 0) throw new IllegalArgumentException("Cấu hình dạng câu hỏi không hợp lệ.");
            if (type.questionCount() == 0 && type.totalScoreCentiPoints() != 0) throw new IllegalArgumentException("Dạng câu không có câu hỏi không được có điểm.");
            if (type.questionCount() > 0 && type.totalScoreCentiPoints() == 0) throw new IllegalArgumentException("Dạng câu có câu hỏi phải được phân bổ điểm.");
            count += type.questionCount(); score += type.totalScoreCentiPoints();
        }
        if (request.totalQuestionCount() == null || count != request.totalQuestionCount() || count == 0) throw new IllegalArgumentException("Tổng số câu không khớp phân bổ theo dạng.");
        if (request.totalScoreCentiPoints() == null || request.totalScoreCentiPoints() != 1000 || score != 1000) throw new IllegalArgumentException("Tổng điểm toàn đề phải chính xác bằng 10 điểm.");
        if (request.knowledgeScope() == null || blank(request.knowledgeScope().bookCode()) || request.knowledgeScope().lessonRefs() == null || request.knowledgeScope().lessonRefs().isEmpty()) throw new IllegalArgumentException("Cần chọn ít nhất một bài SGK.");
    }

    private PracticeExamValidation feasibility(PracticeExamRequest request) {
        Map<String, double[]> minutes = Map.of("MULTIPLE_CHOICE", new double[]{.75, 1, 1.5}, "TRUE_FALSE", new double[]{2, 3, 4}, "SHORT_ANSWER", new double[]{1.5, 2.5, 4}, "ESSAY", new double[]{4, 6, 9});
        int index = "EASY".equals(request.difficulty()) ? 0 : "HARD".equals(request.difficulty()) ? 2 : 1;
        List<PracticeExamValidation.Breakdown> breakdown = new ArrayList<>(); double total = 0;
        for (PracticeExamRequest.QuestionType type : request.questionTypes()) { double estimated = type.questionCount() * minutes.get(type.type())[index]; total += estimated; breakdown.add(new PracticeExamValidation.Breakdown(type.type(), type.questionCount(), estimated)); }
        double allowedOverrun = request.durationMinutes() < 30 ? 5 : 10;
        double maximumEstimated = request.durationMinutes() + allowedOverrun;
        String status = total > maximumEstimated ? "INFEASIBLE" : total > request.durationMinutes() ? "WARNING" : "FEASIBLE";
        String message = switch (status) { case "INFEASIBLE" -> "Cấu hình cần khoảng %.1f phút, vượt mức tối đa %.1f phút được phép cho đề %d phút.".formatted(total, maximumEstimated, request.durationMinutes()); case "WARNING" -> "Thời lượng ước tính %.1f phút, vượt %d phút nhưng vẫn trong dung sai %.0f phút. Vui lòng xác nhận để tiếp tục.".formatted(total, request.durationMinutes(), allowedOverrun); default -> "Cấu hình phù hợp với thời lượng đã chọn."; };
        return new PracticeExamValidation(status, total, maximumEstimated, Math.max(0, total - request.durationMinutes()), message, breakdown);
    }

    private Map<String, String> loadKnowledge(PracticeExamRequest request) {
        Map<String, String> result = new LinkedHashMap<>();
        for (PracticeExamRequest.LessonRef ref : request.knowledgeScope().lessonRefs()) {
            if (ref == null || blank(ref.chapterCode()) || blank(ref.lessonCode())) throw new IllegalArgumentException("Mã bài SGK không hợp lệ.");
            String value = catalogRepository.findLessonKnowledge(request.knowledgeScope().bookCode(), ref.chapterCode(), ref.lessonCode()).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy knowledge_json của bài đã chọn."));
            result.put(ref.chapterCode() + ":" + ref.lessonCode(), value);
        }
        return result;
    }

    private String batchPrompt(PracticeExamRequest request, Map<String, String> knowledge, PracticeExamRequest.QuestionType type,
                               int batchCount, int batchScore, boolean compactRetry) throws Exception {
        return """
                Bạn là giáo viên Việt Nam. Chỉ dùng dữ liệu SGK được cung cấp. Trả về DUY NHẤT một JSON array, không markdown và không có text khác.
                Mỗi phần tử phải đúng schema: {"order":number,"type":"...","content":"...","options":[{"key":"A","content":"..."}],"answer":{},"explanation":"...","scoreCentiPoints":number,"rubric":[{"criterion":"...","scoreCentiPoints":number}],"sourceLessonRefs":[{"bookCode":"...","chapterCode":"...","lessonCode":"..."}]}.
                Tạo CHÍNH XÁC __QUESTION_COUNT__ câu loại __QUESTION_TYPE__, tổng __BATCH_SCORE__ centi điểm. MULTIPLE_CHOICE và TRUE_FALSE có đúng 4 options. ESSAY có rubric cộng đúng điểm. Mỗi câu phải có nguồn thuộc phạm vi. Nội dung và giải thích ngắn gọn.
                GIỚI HẠN ĐỘ DÀI: content tối đa 60 từ. explanation tối đa 40 từ. Mỗi tiêu chí trong rubric tối đa 12 từ và ESSAY tối đa 4 tiêu chí rubric. Không lặp lại đề bài trong explanation.
                QUY TẮC ĐỊNH DẠNG: Chỉ dùng văn bản thường cho nội dung diễn đạt, phương án A/B/C/D là chữ, và đơn vị đơn giản như "100 m", "10 phút". Mọi công thức toán, vật lí, hoá học; phân số, căn, mũ/chỉ số, phương trình phản ứng, vector hoặc ký hiệu khoa học PHẢI viết bằng LaTeX. Công thức trong câu đặt trong MỘT cặp $...$ duy nhất, ví dụ "$v_{tb} = \\frac{s}{t}$", "$\\sqrt{5^2 + 5^2}$", "$\\vec{F_1}$", "$N_2$"; không được đóng $ trước khi công thức kết thúc. Lời giải tính toán nhiều bước PHẢI nằm trọn trong MỘT khối $$...$$ duy nhất; không được tách từng lệnh \\sqrt, \\cdot, \\cos, \\theta, \\approx, \\Rightarrow thành dòng hay thành nhiều khối. Luôn viết vector đúng cú pháp \\vec{F_1}, \\vec{F_2}; không viết vecF_1, \\vecF_1 hoặc \\vec F_1. Phân số PHẢI có ngoặc nhọn, ví dụ \\frac{1}{2}, \\frac{F}{m}; không viết \\frac12, frac12, fracFm. Không viết thiếu dấu gạch chéo như frac, cdot, approx, textm/s. Không viết công thức dạng văn bản thường như "v = s/t", "sqrt(5^2 + 5^2)", "NH4+ + OH- → NH3 + H2O". Trong JSON, phải escape mọi dấu gạch chéo ngược của LaTeX, ví dụ "\\\\frac", "\\\\sqrt", "\\\\mathrm", "\\\\vec".
                QUY TẮC CHẤT LƯỢNG NỘI DUNG: Với MULTIPLE_CHOICE: chỉ một đáp án đúng duy nhất; ba phương án nhiễu phải hợp lý, dựa trên sai lầm phổ biến của học sinh, không phải nhiễu vô nghĩa hay hiển nhiên sai; không dùng "tất cả đều đúng/sai"; các phương án có độ dài và hình thức tương đương nhau, không để đáp án đúng nổi bật hơn do dài/ngắn khác thường. Với TRUE_FALSE: 4 mệnh đề phải độc lập nhau, mỗi mệnh đề kiểm tra một khía cạnh kiến thức riêng; không được để cả 4 mệnh đề cùng đúng hoặc cùng sai. Với SHORT_ANSWER: đáp án phải là một giá trị duy nhất, không mơ hồ, không có nhiều cách diễn đạt hợp lệ khác nhau; nếu là số phải ghi rõ đơn vị trong đáp án. Với ESSAY: đây là bài tập tính toán/giải quyết vấn đề, KHÔNG phải bài luận mở; rubric phải chia theo từng bước giải (ví dụ: thiết lập đúng công thức/phương trình, thay số đúng, tính ra đúng kết quả và đơn vị), mỗi bước có điểm riêng thay vì liệt kê tiêu chí chung chung.
                MỤC TIÊU CỦA GIÁO VIÊN (ưu tiên bám sát khi chọn nội dung câu hỏi, vẫn phải nằm trong phạm vi SGK): __TEACHER_OBJECTIVE__
                CẤU HÌNH ĐỀ: __REQUEST_CONFIG__
                KNOWLEDGE_JSON: __KNOWLEDGE__
                __RETRY_INSTRUCTION__"""
                .replace("__QUESTION_COUNT__", String.valueOf(batchCount))
                .replace("__QUESTION_TYPE__", type.type())
                .replace("__BATCH_SCORE__", String.valueOf(batchScore))
                .replace("__TEACHER_OBJECTIVE__", blank(request.objective()) ? "Không có yêu cầu đặc biệt." : request.objective())
                .replace("__REQUEST_CONFIG__", objectMapper.writeValueAsString(request))
                .replace("__KNOWLEDGE__", objectMapper.writeValueAsString(knowledge))
                .replace("__RETRY_INSTRUCTION__", compactRetry
                        ? "LẦN THỬ LẠI: Bắt buộc đóng đủ mọi dấu ] } và không thêm văn bản ngoài JSON."
                        : "");
    }

    private static int proportionalScore(int totalScore, int totalCount, int offset, int count) {
        return Math.floorDiv((offset + count) * totalScore, totalCount) - Math.floorDiv(offset * totalScore, totalCount);
    }

    private static String repairMathText(String value) {
        if (value == null || value.isBlank()) return value;
        String repaired = repairDelimitedMath(repairDelimitedMath(value, DISPLAY_MATH, "$$", "$$"), INLINE_MATH, "$", "$");
        return Arrays.stream(repaired.split("\\n", -1))
                .map(PracticeExamService::repairUnwrappedLatexLine)
                .collect(java.util.stream.Collectors.joining("\n"));
    }

    private static String repairUnwrappedLatexLine(String line) {
        if (line.contains("$")) return line;
        String normalized = line.replaceAll("\\\\\\\\(?=[A-Za-z])", "\\\\");
        if (normalized.matches(".*\\\\(frac|sqrt|vec|cdot|approx|cos|sin|tan|text)\\b.*")) return "$" + normalizeLatex(normalized) + "$";
        return normalized.replaceAll("(?<!\\\\)\\bvec\\s*([A-Za-z](?:_\\{?[A-Za-z0-9]+\\}?)?)", "\\$\\\\vec{$1}\\$");
    }

    private static String repairDelimitedMath(String value, Pattern pattern, String open, String close) {
        Matcher matcher = pattern.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(open + normalizeLatex(matcher.group(1)) + close));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String normalizeLatex(String value) {
        return value.trim()
                .replace("²", "^2")
                .replaceAll("(?<!\\\\)frac\\s*Delta\\s*([A-Za-z])\\s*Delta\\s*([A-Za-z])", "\\\\frac{\\\\Delta $1}{\\\\Delta $2}")
                .replaceAll("\\\\frac\\s*Delta\\s*([A-Za-z])\\s*Delta\\s*([A-Za-z])", "\\\\frac{\\\\Delta $1}{\\\\Delta $2}")
                .replaceAll("(?<!\\\\)frac\\s*([0-9])\\s*([0-9])", "\\\\frac{$1}{$2}")
                .replaceAll("\\\\frac\\s*([0-9])\\s*([0-9])", "\\\\frac{$1}{$2}")
                .replaceAll("(?<!\\\\)frac\\s*([A-Za-z])\\s*([A-Za-z])", "\\\\frac{$1}{$2}")
                .replaceAll("\\\\frac\\s*([A-Za-z])\\s*([A-Za-z])(?![A-Za-z])", "\\\\frac{$1}{$2}")
                .replaceAll("(?<!\\\\)text\\s*([A-Za-z][A-Za-z0-9/^]*)", "\\\\text{$1}")
                .replaceAll("\\\\text(?!\\{)\\s*([A-Za-z][A-Za-z0-9/^]*)", "\\\\text{$1}")
                .replaceAll("(?<!\\\\)(cdot|approx|cos|sin|tan)(?=[0-9A-Za-z({])", "\\\\$1 ")
                .replaceAll("(?<!\\\\)\\b(sqrt|times|theta|alpha|beta|gamma|pi|Rightarrow|leftarrow|leq|geq)\\b", "\\\\$1")
                .replaceAll("\\\\(cdot|approx|cos|sin|tan)(?=[0-9A-Za-z({])", "\\\\$1 ")
                .replaceAll("(?<!\\\\)\\bDelta\\b", "\\\\Delta");
    }

    private static List<PracticeExam.Option> repairOptions(List<PracticeExam.Option> options) {
        if (options == null) return null;
        return options.stream()
                .map(option -> new PracticeExam.Option(option.key(), repairMathText(option.content())))
                .toList();
    }

    private static List<PracticeExam.Rubric> repairRubric(List<PracticeExam.Rubric> rubric) {
        if (rubric == null) return null;
        return rubric.stream()
                .map(item -> new PracticeExam.Rubric(repairMathText(item.criterion()), item.scoreCentiPoints()))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> repairAnswer(Map<String, Object> answer) {
        if (answer == null) return null;
        Map<String, Object> repaired = new LinkedHashMap<>();
        answer.forEach((key, value) -> repaired.put(key, repairMathObject(value)));
        return repaired;
    }

    @SuppressWarnings("unchecked")
    private static Object repairMathObject(Object value) {
        if (value instanceof String text) return repairMathText(text);
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> repaired = new LinkedHashMap<>();
            map.forEach((key, nested) -> repaired.put(String.valueOf(key), repairMathObject(nested)));
            return repaired;
        }
        if (value instanceof List<?> list) return list.stream().map(PracticeExamService::repairMathObject).toList();
        return value;
    }

    /**
     * Check cấu trúc CHO 1 CÂU (thiếu content/answer/nguồn, đủ 4 phương án MC/TRUE_FALSE, rubric
     * tự luận cộng đúng điểm). Gọi ngay trong {@link #generateBatch} (mỗi batch xong) để
     * {@code generateStreaming} báo lỗi đúng lúc, và lại trong {@link #validateCompletedExam}
     * làm lớp phòng vệ cuối cho đường {@link #generate(PracticeExamRequest)} đồng bộ.
     */
    private void validateQuestionStructure(PracticeExam.Question question) {
        if (question == null || blank(question.content()) || question.answer() == null
                || question.sourceLessonRefs() == null || question.sourceLessonRefs().isEmpty()) {
            throw new IllegalArgumentException("AI trả câu hỏi thiếu nội dung, đáp án hoặc nguồn SGK.");
        }
        if ("MULTIPLE_CHOICE".equals(question.type()) && (question.options() == null || question.options().size() != 4)) {
            throw new IllegalArgumentException("Câu trắc nghiệm nhiều lựa chọn phải có 4 phương án.");
        }
        if ("TRUE_FALSE".equals(question.type()) && (question.options() == null || question.options().size() != 4)) {
            throw new IllegalArgumentException("Câu đúng-sai phải có 4 mệnh đề.");
        }
        if ("ESSAY".equals(question.type()) && (question.rubric() == null
                || question.rubric().stream().mapToInt(PracticeExam.Rubric::scoreCentiPoints).sum() != question.scoreCentiPoints())) {
            throw new IllegalArgumentException("Rubric tự luận không khớp điểm câu.");
        }
    }

    private void validateCompletedExam(PracticeExam exam, PracticeExamRequest request) {
        if (exam == null || exam.questions() == null || exam.questions().size() != request.totalQuestionCount() || exam.totalScoreCentiPoints() != 1000) throw new IllegalArgumentException("AI trả thiếu câu hỏi hoặc sai tổng điểm.");
        Map<String, PracticeExamRequest.QuestionType> expected = new HashMap<>(); request.questionTypes().forEach(type -> expected.put(type.type(), type));
        Map<String, Integer> counts = new HashMap<>(); Map<String, Integer> scores = new HashMap<>();
        for (PracticeExam.Question question : exam.questions()) {
            if (question == null || !expected.containsKey(question.type())) throw new IllegalArgumentException("AI trả câu hỏi thiếu nội dung, đáp án hoặc nguồn SGK.");
            validateQuestionStructure(question);
            counts.merge(question.type(), 1, Integer::sum); scores.merge(question.type(), question.scoreCentiPoints(), Integer::sum);
        }
        for (PracticeExamRequest.QuestionType type : request.questionTypes()) {
            if (counts.getOrDefault(type.type(), 0).intValue() != type.questionCount()
                    || scores.getOrDefault(type.type(), 0).intValue() != type.totalScoreCentiPoints()) {
                log.warn("PRACTICE_EXAM_AGGREGATE_NORMALIZED type={} expectedCount={} actualCount={} expectedScore={} actualScore={}",
                        type.type(), type.questionCount(), counts.getOrDefault(type.type(), 0),
                        type.totalScoreCentiPoints(), scores.getOrDefault(type.type(), 0));
            }
        }
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String stripFence(String raw) { if (raw == null) return ""; String value = raw.trim(); if (!value.startsWith("```")) return value; int start = value.indexOf('\n'); value = start < 0 ? "" : value.substring(start + 1); return value.endsWith("```") ? value.substring(0, value.length() - 3).trim() : value.trim(); }
    private record BatchTask(PracticeExamRequest.QuestionType type, int offset, int batchCount, int batchScore, int firstOrder) {}
    private record BatchResult(int firstOrder, List<PracticeExam.Question> questions) {}
}
