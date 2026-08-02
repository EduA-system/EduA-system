package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.domain.model.practiceexam.PracticeExamValidation;
import com.edua.beeduasystem.domain.exception.PracticeExamGenerationException;
import com.edua.beeduasystem.presentation.dto.practiceexam.GenerateExplanationsRequest;
import com.edua.beeduasystem.presentation.dto.practiceexam.GenerateExplanationsResponse;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.io.JsonEOFException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
public class PracticeExamService {
    private static final Set<String> TYPES = Set.of("MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY");
    private static final Set<String> CORE_ONLY_TYPES = Set.of("MULTIPLE_CHOICE", "TRUE_FALSE");
    private static final Pattern DISPLAY_MATH = Pattern.compile("\\$\\$([\\s\\S]+?)\\$\\$");
    private static final Pattern INLINE_MATH = Pattern.compile("(?<!\\$)\\$([^$\\n]+?)\\$(?!\\$)");
    private static final Pattern HTML_NAMED_ENTITY = Pattern.compile("&(amp|lt|gt|quot|apos);");
    private static final Pattern HTML_NUMERIC_ENTITY = Pattern.compile("&#0*(38|60|62|34|39);");
    private final TextbookCatalogRepository catalogRepository;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final int maxConcurrency;
    private final long regularBatchTimeoutSeconds;
    private final long essayBatchTimeoutSeconds;
    private final long totalTimeoutSeconds;

    public PracticeExamService(TextbookCatalogRepository catalogRepository, AiClient aiClient, ObjectMapper objectMapper,
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

    // ---- Phase 1: question generation (MC/TF core-only, SHORT_ANSWER/ESSAY full as before) ----

    public PracticeExam generateQuestions(PracticeExamRequest request) {
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
        UUID runId = UUID.randomUUID();
        return generateQuestionsInBatches(runId, request, knowledge);
    }

    private PracticeExam generateQuestionsInBatches(UUID runId, PracticeExamRequest request, Map<String, String> knowledge) {
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        AtomicBoolean cancelled = new AtomicBoolean(false);
        List<CompletableFuture<BatchResult>> futures = new ArrayList<>();
        try {
            List<BatchTask> tasks = buildBatchTasks(request);
            Semaphore permits = new Semaphore(Math.min(maxConcurrency, Math.max(1, tasks.size())));
            log.info("PRACTICE_EXAM_BATCH_PLAN_READY runId={} batchCount={} maxConcurrency={} regularTimeoutSeconds={} essayTimeoutSeconds={} totalTimeoutSeconds={}",
                    runId, tasks.size(), maxConcurrency, regularBatchTimeoutSeconds, essayBatchTimeoutSeconds, totalTimeoutSeconds);
            for (BatchTask task : tasks) {
                futures.add(CompletableFuture.supplyAsync(() -> runBatchTask(runId, request, knowledge, task, permits, cancelled), executor));
            }
            List<BatchResult> results = collectResults(futures, cancelled);
            List<PracticeExam.Question> questions = results.stream()
                    .sorted(Comparator.comparingInt(BatchResult::firstOrder))
                    .flatMap(result -> result.questions().stream())
                    .toList();
            PracticeExam exam = new PracticeExam(request.title(), "Đọc kỹ từng câu hỏi và trình bày bài làm rõ ràng.",
                    request.durationMinutes(), request.totalScoreCentiPoints(), questions);
            validateQuestionStructure(exam, request);
            log.info("PRACTICE_EXAM_GENERATION_SUCCEEDED runId={} generatedQuestionCount={}", runId, exam.questions().size());
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

    // Dạng câu chậm nhất (ESSAY) chạy trước để không phải xếp hàng chờ Semaphore lâu — số thứ tự
    // câu trong đề (firstOrder) không phụ thuộc thứ tự này vì kết quả luôn được sắp lại theo
    // firstOrder khi gộp (generateQuestionsInBatches), nên đổi thứ tự nộp việc là an toàn.
    private static final List<String> SCHEDULE_PRIORITY = List.of("ESSAY", "SHORT_ANSWER", "TRUE_FALSE", "MULTIPLE_CHOICE");

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
        tasks.sort(Comparator.comparingInt(task -> SCHEDULE_PRIORITY.indexOf(task.type().type())));
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

    private BatchResult runBatchTask(UUID runId, PracticeExamRequest request, Map<String, String> knowledge, BatchTask task,
                                     Semaphore permits, AtomicBoolean cancelled) {
        boolean acquired = false;
        long queueStart = System.nanoTime();
        try {
            if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
            permits.acquire();
            acquired = true;
            long queueWaitMs = (System.nanoTime() - queueStart) / 1_000_000;
            if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
            List<PracticeExam.Question> questions = generateBatch(runId, request, knowledge, task, cancelled, queueWaitMs);
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

    private List<PracticeExam.Question> generateBatch(UUID runId, PracticeExamRequest request, Map<String, String> knowledge,
                                                      BatchTask task, AtomicBoolean cancelled, long queueWaitMs) throws Exception {
        Exception lastFailure = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            String raw = null;
            long aiLatencyMs = 0;
            try {
                if (cancelled.get()) throw new CancellationException("Đã dừng tạo đề vì một nhóm câu khác bị lỗi.");
                if (attempt > 0) backoffBeforeRetry(attempt);
                log.info("PRACTICE_EXAM_AI_BATCH_STARTED runId={} type={} offset={} count={} score={} attempt={} compactRetry={} queueWaitMs={}",
                        runId, task.type().type(), task.offset(), task.batchCount(), task.batchScore(), attempt + 1, attempt > 0, queueWaitMs);
                long aiStart = System.nanoTime();
                raw = generateWithTimeout(questionPrompt(request, knowledge, task.type(), task.batchCount(), task.batchScore(), attempt > 0),
                        timeoutSeconds(task.type().type()));
                aiLatencyMs = (System.nanoTime() - aiStart) / 1_000_000;
                log.info("PRACTICE_EXAM_AI_RESPONSE_RECEIVED runId={} type={} offset={} attempt={} characters={} fenced={} aiLatencyMs={}", runId,
                        task.type().type(), task.offset(), attempt + 1, raw == null ? 0 : raw.length(),
                        raw != null && raw.trim().startsWith("```"), aiLatencyMs);
                List<PracticeExam.Question> generated = objectMapper.readValue(stripFence(raw), new TypeReference<>() {});
                if (generated.size() != task.batchCount()) throw new IllegalArgumentException("AI trả sai số lượng câu trong một lô.");
                List<PracticeExam.Question> normalized = new ArrayList<>();
                for (int index = 0; index < generated.size(); index++) {
                    PracticeExam.Question question = generated.get(index);
                    if (question == null || !task.type().type().equals(question.type())) {
                        throw new IllegalArgumentException("AI trả sai loại câu hỏi trong một lô.");
                    }
                    int score = proportionalScore(task.batchScore(), task.batchCount(), index, 1);
                    normalized.add(new PracticeExam.Question(task.firstOrder() + index, question.type(),
                            repairMathText(question.content()), repairOptions(question.options()),
                            repairAnswer(question.answer()), repairMathText(question.explanation()), score,
                            repairRubric(question.rubric()), question.sourceLessonRefs()));
                }
                if (attempt > 0) {
                    log.info("PRACTICE_EXAM_AI_RETRY_SUCCEEDED runId={} type={} offset={} attempt={}", runId, task.type().type(), task.offset(), attempt + 1);
                }
                return normalized;
            } catch (CancellationException failure) {
                throw failure;
            } catch (InterruptedException failure) {
                Thread.currentThread().interrupt();
                throw failure;
            } catch (Exception failure) {
                lastFailure = failure;
                log.warn("PRACTICE_EXAM_AI_BATCH_FAILED runId={} type={} offset={} attempt={} failureType={} queueWaitMs={} aiLatencyMs={} rawPreview={} message={}",
                        runId, task.type().type(), task.offset(), attempt + 1, classifyFailure(raw, failure), queueWaitMs, aiLatencyMs,
                        preview(raw), failure.getMessage());
            }
        }
        throw lastFailure == null ? new IllegalStateException("AI không trả kết quả cho một lô câu hỏi.") : lastFailure;
    }

    // ---- Phase 2: explanation generation (MULTIPLE_CHOICE/TRUE_FALSE only) ----

    public GenerateExplanationsResponse generateExplanations(GenerateExplanationsRequest request) {
        validateExplanationsRequest(request);
        UUID runId = UUID.randomUUID();
        Map<String, String> knowledge = loadKnowledgeForQuestions(request.bookCode(), request.questions());
        log.info("PRACTICE_EXAM_EXPLANATION_STARTED runId={} bookCode={} questionCount={}", runId, request.bookCode(), request.questions().size());
        List<GenerateExplanationsResponse.ExplanationEntry> entries = generateExplanationsInBatches(runId, knowledge, request.questions());
        Set<Integer> expectedOrders = request.questions().stream().map(PracticeExam.Question::order).collect(Collectors.toSet());
        Set<Integer> actualOrders = entries.stream().map(GenerateExplanationsResponse.ExplanationEntry::order).collect(Collectors.toSet());
        if (!expectedOrders.equals(actualOrders)) {
            throw new IllegalArgumentException("AI trả lời giải thiếu hoặc thừa so với danh sách câu hỏi đã gửi.");
        }
        log.info("PRACTICE_EXAM_EXPLANATION_SUCCEEDED runId={} explanationCount={}", runId, entries.size());
        return new GenerateExplanationsResponse(entries);
    }

    private void validateExplanationsRequest(GenerateExplanationsRequest request) {
        if (request == null || blank(request.bookCode()) || request.questions() == null || request.questions().isEmpty()) {
            throw new IllegalArgumentException("Cần gửi kèm bookCode và danh sách câu hỏi cần sinh lời giải.");
        }
        for (PracticeExam.Question question : request.questions()) {
            if (question == null || !CORE_ONLY_TYPES.contains(question.type())) {
                throw new IllegalArgumentException("Chỉ hỗ trợ sinh lời giải bổ sung cho câu trắc nghiệm nhiều lựa chọn hoặc đúng-sai.");
            }
            if (blank(question.content()) || question.answer() == null || question.sourceLessonRefs() == null || question.sourceLessonRefs().isEmpty()) {
                throw new IllegalArgumentException("Câu hỏi gửi lên thiếu nội dung, đáp án hoặc nguồn SGK.");
            }
        }
    }

    private Map<String, String> loadKnowledgeForQuestions(String bookCode, List<PracticeExam.Question> questions) {
        Map<String, String> result = new LinkedHashMap<>();
        for (PracticeExam.Question question : questions) {
            for (PracticeExam.LessonRef ref : question.sourceLessonRefs()) {
                if (ref == null || blank(ref.chapterCode()) || blank(ref.lessonCode())) throw new IllegalArgumentException("Mã bài SGK không hợp lệ.");
                String key = ref.chapterCode() + ":" + ref.lessonCode();
                if (result.containsKey(key)) continue;
                String value = catalogRepository.findLessonKnowledge(bookCode, ref.chapterCode(), ref.lessonCode())
                        .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy knowledge_json của bài đã chọn."));
                result.put(key, value);
            }
        }
        return result;
    }

    private List<GenerateExplanationsResponse.ExplanationEntry> generateExplanationsInBatches(UUID runId, Map<String, String> knowledge,
                                                                                               List<PracticeExam.Question> questions) {
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        AtomicBoolean cancelled = new AtomicBoolean(false);
        List<CompletableFuture<List<GenerateExplanationsResponse.ExplanationEntry>>> futures = new ArrayList<>();
        try {
            List<ExplanationBatchTask> tasks = buildExplanationBatchTasks(questions);
            Semaphore permits = new Semaphore(Math.min(maxConcurrency, Math.max(1, tasks.size())));
            log.info("PRACTICE_EXAM_EXPLANATION_BATCH_PLAN_READY runId={} batchCount={} maxConcurrency={}", runId, tasks.size(), maxConcurrency);
            for (ExplanationBatchTask task : tasks) {
                futures.add(CompletableFuture.supplyAsync(() -> runExplanationBatchTask(runId, knowledge, task, permits, cancelled), executor));
            }
            return collectResults(futures, cancelled).stream().flatMap(List::stream).toList();
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (PracticeExamGenerationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo được lời giải đúng cấu trúc. Vui lòng thử lại.", exception);
        } finally {
            cancelled.set(true);
            executor.shutdownNow();
        }
    }

    private List<ExplanationBatchTask> buildExplanationBatchTasks(List<PracticeExam.Question> questions) {
        Map<String, List<PracticeExam.Question>> byType = new LinkedHashMap<>();
        for (PracticeExam.Question question : questions) {
            byType.computeIfAbsent(question.type(), key -> new ArrayList<>()).add(question);
        }
        List<ExplanationBatchTask> tasks = new ArrayList<>();
        byType.forEach((type, group) -> {
            int limit = batchLimit(type);
            for (int offset = 0; offset < group.size(); offset += limit) {
                tasks.add(new ExplanationBatchTask(type, group.subList(offset, Math.min(offset + limit, group.size()))));
            }
        });
        return tasks;
    }

    private List<GenerateExplanationsResponse.ExplanationEntry> runExplanationBatchTask(UUID runId, Map<String, String> knowledge,
                                                                                         ExplanationBatchTask task, Semaphore permits, AtomicBoolean cancelled) {
        boolean acquired = false;
        long queueStart = System.nanoTime();
        try {
            if (cancelled.get()) throw new CancellationException("Đã dừng sinh lời giải vì một nhóm câu khác bị lỗi.");
            permits.acquire();
            acquired = true;
            long queueWaitMs = (System.nanoTime() - queueStart) / 1_000_000;
            if (cancelled.get()) throw new CancellationException("Đã dừng sinh lời giải vì một nhóm câu khác bị lỗi.");
            return generateExplanationBatch(runId, knowledge, task, cancelled, queueWaitMs);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new PracticeExamGenerationException("Quá trình sinh lời giải đã bị hủy.", exception);
        } catch (PracticeExamGenerationException | CancellationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo được lời giải đúng cấu trúc. Vui lòng thử lại.", exception);
        } finally {
            if (acquired) permits.release();
        }
    }

    private List<GenerateExplanationsResponse.ExplanationEntry> generateExplanationBatch(UUID runId, Map<String, String> knowledge,
                                                                                          ExplanationBatchTask task, AtomicBoolean cancelled,
                                                                                          long queueWaitMs) throws Exception {
        Exception lastFailure = null;
        Set<Integer> expectedOrders = task.questions().stream().map(PracticeExam.Question::order).collect(Collectors.toSet());
        for (int attempt = 0; attempt < 2; attempt++) {
            String raw = null;
            long aiLatencyMs = 0;
            try {
                if (cancelled.get()) throw new CancellationException("Đã dừng sinh lời giải vì một nhóm câu khác bị lỗi.");
                if (attempt > 0) backoffBeforeRetry(attempt);
                log.info("PRACTICE_EXAM_EXPLANATION_BATCH_STARTED runId={} type={} count={} attempt={} compactRetry={} queueWaitMs={}",
                        runId, task.type(), task.questions().size(), attempt + 1, attempt > 0, queueWaitMs);
                long aiStart = System.nanoTime();
                raw = generateWithTimeout(explanationPrompt(knowledge, task.questions(), attempt > 0), timeoutSeconds(task.type()));
                aiLatencyMs = (System.nanoTime() - aiStart) / 1_000_000;
                log.info("PRACTICE_EXAM_EXPLANATION_RESPONSE_RECEIVED runId={} type={} attempt={} characters={} fenced={} aiLatencyMs={}", runId,
                        task.type(), attempt + 1, raw == null ? 0 : raw.length(), raw != null && raw.trim().startsWith("```"), aiLatencyMs);
                List<GenerateExplanationsResponse.ExplanationEntry> generated = objectMapper.readValue(stripFence(raw), new TypeReference<>() {});
                Set<Integer> actualOrders = generated.stream().map(GenerateExplanationsResponse.ExplanationEntry::order).collect(Collectors.toSet());
                if (!actualOrders.equals(expectedOrders)) throw new IllegalArgumentException("AI trả lời giải sai số câu hoặc sai order trong một lô.");
                List<GenerateExplanationsResponse.ExplanationEntry> normalized = generated.stream()
                        .map(entry -> new GenerateExplanationsResponse.ExplanationEntry(entry.order(), repairMathText(entry.explanation())))
                        .toList();
                for (GenerateExplanationsResponse.ExplanationEntry entry : normalized) {
                    if (blank(entry.explanation())) throw new IllegalArgumentException("AI trả lời giải rỗng cho một câu.");
                }
                if (attempt > 0) {
                    log.info("PRACTICE_EXAM_AI_RETRY_SUCCEEDED runId={} type={} attempt={}", runId, task.type(), attempt + 1);
                }
                return normalized;
            } catch (CancellationException failure) {
                throw failure;
            } catch (InterruptedException failure) {
                Thread.currentThread().interrupt();
                throw failure;
            } catch (Exception failure) {
                lastFailure = failure;
                log.warn("PRACTICE_EXAM_EXPLANATION_BATCH_FAILED runId={} type={} attempt={} failureType={} queueWaitMs={} aiLatencyMs={} rawPreview={} message={}",
                        runId, task.type(), attempt + 1, classifyFailure(raw, failure), queueWaitMs, aiLatencyMs, preview(raw), failure.getMessage());
            }
        }
        throw lastFailure == null ? new IllegalStateException("AI không trả kết quả cho một lô lời giải.") : lastFailure;
    }

    // ---- Shared concurrency plumbing ----

    /**
     * Chờ TẤT CẢ future hoàn tất (thành công hoặc thất bại hẳn sau khi đã retry) trước khi quyết định
     * kết quả chung — một batch thất bại không được hủy các batch khác đang có khả năng thành công.
     * Chỉ hủy toàn bộ khi hết tổng thời gian cho phép hoặc luồng chính bị interrupt (an toàn toàn cục).
     */
    private <T> List<T> collectResults(List<CompletableFuture<T>> futures, AtomicBoolean cancelled) {
        BlockingQueue<CompletableFuture<T>> completed = new LinkedBlockingQueue<>();
        futures.forEach(future -> future.whenComplete((ignored, error) -> completed.add(future)));
        List<T> results = new ArrayList<>();
        List<PracticeExamGenerationException> failures = new ArrayList<>();
        long deadlineNanos = System.nanoTime() + TimeUnit.SECONDS.toNanos(totalTimeoutSeconds);
        for (int remaining = futures.size(); remaining > 0; remaining--) {
            CompletableFuture<T> future;
            try {
                long waitNanos = deadlineNanos - System.nanoTime();
                if (waitNanos <= 0) {
                    cancelRemaining(futures, cancelled);
                    throw timeoutFailure(results.size(), futures.size());
                }
                future = completed.poll(waitNanos, TimeUnit.NANOSECONDS);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                cancelRemaining(futures, cancelled);
                throw new PracticeExamGenerationException("Quá trình đã bị hủy.", exception);
            }
            if (future == null) {
                cancelRemaining(futures, cancelled);
                throw timeoutFailure(results.size(), futures.size());
            }
            try {
                results.add(future.join());
            } catch (CompletionException | CancellationException exception) {
                failures.add(unwrapGenerationFailure(exception));
            }
        }
        if (!failures.isEmpty()) throw aggregateFailure(failures, futures.size());
        return results;
    }

    private PracticeExamGenerationException aggregateFailure(List<PracticeExamGenerationException> failures, int totalBatches) {
        if (failures.size() == 1) return failures.get(0);
        return new PracticeExamGenerationException(
                failures.size() + "/" + totalBatches + " nhóm câu AI tạo thất bại sau khi đã thử lại. Lỗi đầu tiên: " + failures.get(0).getMessage(),
                failures.get(0));
    }

    private PracticeExamGenerationException timeoutFailure(int succeeded, int totalBatches) {
        return new PracticeExamGenerationException(
                succeeded + "/" + totalBatches + " nhóm câu đã tạo xong, nhưng AI mất quá " + totalTimeoutSeconds
                        + " giây để hoàn tất phần còn lại. Vui lòng thử lại hoặc giảm số câu.", null);
    }

    private <T> void cancelRemaining(List<CompletableFuture<T>> futures, AtomicBoolean cancelled) {
        cancelled.set(true);
        futures.forEach(future -> {
            if (!future.isDone()) future.cancel(true);
        });
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

    // ---- Debug logging helpers ----

    private static String preview(String raw) {
        if (raw == null) return "<null>";
        String singleLine = raw.replaceAll("\\s+", " ").trim();
        return singleLine.length() <= 2000 ? singleLine : singleLine.substring(0, 2000) + "…";
    }

    private static String classifyFailure(String raw, Exception exception) {
        if (exception instanceof TimeoutException) return "TIMEOUT";
        if (exception instanceof CancellationException) return "CANCELLED";
        String trimmed = raw == null ? "" : stripFence(raw).trim();
        boolean endsClosed = trimmed.endsWith("]") || trimmed.endsWith("}");
        boolean truncatedSignal = exception instanceof JsonEOFException
                || (exception.getMessage() != null && exception.getMessage().contains("end-of-input"));
        if (raw != null && (!endsClosed || truncatedSignal)) return "TRUNCATED_OUTPUT";
        if (exception instanceof JsonProcessingException) return "JSON_SYNTAX_ERROR";
        return "SCHEMA_ERROR";
    }

    // ---- Validation ----

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

    // ---- Prompts ----

    private String questionPrompt(PracticeExamRequest request, Map<String, String> knowledge, PracticeExamRequest.QuestionType type,
                                  int batchCount, int batchScore, boolean compactRetry) throws Exception {
        return CORE_ONLY_TYPES.contains(type.type())
                ? questionOnlyPrompt(request, knowledge, type, batchCount, batchScore, compactRetry)
                : batchPrompt(request, knowledge, type, batchCount, batchScore, compactRetry);
    }

    private String questionOnlyPrompt(PracticeExamRequest request, Map<String, String> knowledge, PracticeExamRequest.QuestionType type,
                                      int batchCount, int batchScore, boolean compactRetry) throws Exception {
        String answerSchema = "TRUE_FALSE".equals(type.type())
                ? "\"answer\":{\"a\":boolean,\"b\":boolean,\"c\":boolean,\"d\":boolean}"
                : "\"answer\":{\"correctOptionKey\":\"A\"}";
        return """
                You are a Vietnamese teacher. Use ONLY the provided SGK (textbook) data. Write all question content and options in Vietnamese. Return ONLY a JSON array, no markdown and no other text.
                Every element must match this schema: {"order":number,"type":"...","content":"...","options":[{"key":"A","content":"..."}],__ANSWER_SCHEMA__,"scoreCentiPoints":number,"sourceLessonRefs":[{"bookCode":"...","chapterCode":"...","lessonCode":"..."}]}. Do NOT include an "explanation" or "rubric" field in this response — those are generated separately afterwards.
                Generate EXACTLY __QUESTION_COUNT__ questions of type __QUESTION_TYPE__, totaling __BATCH_SCORE__ centi-points, with exactly 4 options each. For TRUE_FALSE, "answer" must judge each proposition A/B/C/D independently as true or false — do NOT use a single correct-option key, since more than one proposition can be true and more than one can be false. Every question must cite a source within the given scope. Keep content concise.
                FORMATTING RULES: Use plain text only for descriptive wording, option labels A/B/C/D as letters, and simple units like "100 m", "10 phút". Every math, physics, or chemistry formula — fractions, roots, exponents/subscripts, reaction equations, vectors, or scientific notation — MUST be written in LaTeX. Inline formulas must sit inside a SINGLE pair of $...$, e.g. "$v_{tb} = \\frac{s}{t}$", "$\\sqrt{5^2 + 5^2}$", "$\\vec{F_1}$", "$N_2$"; never close the $ before the formula is finished. Always write vectors with the correct syntax \\vec{F_1}, \\vec{F_2}; never vecF_1, \\vecF_1, or \\vec F_1. Fractions MUST use braces, e.g. \\frac{1}{2}, \\frac{F}{m}; never \\frac12, frac12, or fracFm. Never drop the backslash, e.g. frac, cdot, approx. Never write formulas as plain text such as "v = s/t", "sqrt(5^2 + 5^2)". In the JSON output, every LaTeX backslash must be escaped, e.g. "\\\\frac", "\\\\sqrt", "\\\\mathrm", "\\\\vec".
                EXAM CONFIGURATION: __REQUEST_CONFIG__
                KNOWLEDGE_JSON: __KNOWLEDGE__
                __RETRY_INSTRUCTION__"""
                .replace("__ANSWER_SCHEMA__", answerSchema)
                .replace("__QUESTION_COUNT__", String.valueOf(batchCount))
                .replace("__QUESTION_TYPE__", type.type())
                .replace("__BATCH_SCORE__", String.valueOf(batchScore))
                .replace("__REQUEST_CONFIG__", objectMapper.writeValueAsString(request))
                .replace("__KNOWLEDGE__", objectMapper.writeValueAsString(knowledge))
                .replace("__RETRY_INSTRUCTION__", compactRetry
                        ? "RETRY: You MUST close every ] and } bracket, and must not add any text outside the JSON."
                        : "");
    }

    private String batchPrompt(PracticeExamRequest request, Map<String, String> knowledge, PracticeExamRequest.QuestionType type,
                               int batchCount, int batchScore, boolean compactRetry) throws Exception {
        return """
                You are a Vietnamese teacher. Use ONLY the provided SGK (textbook) data. Write all question content, options, and explanations in Vietnamese. Return ONLY a JSON array, no markdown and no other text.
                Every element must match this schema: {"order":number,"type":"...","content":"...","options":[{"key":"A","content":"..."}],"answer":{},"explanation":"...","scoreCentiPoints":number,"rubric":[{"criterion":"...","scoreCentiPoints":number}],"sourceLessonRefs":[{"bookCode":"...","chapterCode":"...","lessonCode":"..."}]}.
                Generate EXACTLY __QUESTION_COUNT__ questions of type __QUESTION_TYPE__, totaling __BATCH_SCORE__ centi-points. MULTIPLE_CHOICE and TRUE_FALSE must have exactly 4 options. ESSAY must have a rubric whose points sum exactly to the question's score. Every question must cite a source within the given scope. Keep content and explanations concise.
                FORMATTING RULES: Use plain text only for descriptive wording, option labels A/B/C/D as letters, and simple units like "100 m", "10 phút". Every math, physics, or chemistry formula — fractions, roots, exponents/subscripts, reaction equations, vectors, or scientific notation — MUST be written in LaTeX. Inline formulas must sit inside a SINGLE pair of $...$, e.g. "$v_{tb} = \\frac{s}{t}$", "$\\sqrt{5^2 + 5^2}$", "$\\vec{F_1}$", "$N_2$"; never close the $ before the formula is finished. Multi-step calculation solutions MUST be enclosed in a SINGLE $$...$$ block; never split individual commands like \\sqrt, \\cdot, \\cos, \\theta, \\approx, \\Rightarrow across separate lines or blocks. Always write vectors with the correct syntax \\vec{F_1}, \\vec{F_2}; never vecF_1, \\vecF_1, or \\vec F_1. Fractions MUST use braces, e.g. \\frac{1}{2}, \\frac{F}{m}; never \\frac12, frac12, or fracFm. Never drop the backslash, e.g. frac, cdot, approx, textm/s. Never write formulas as plain text such as "v = s/t", "sqrt(5^2 + 5^2)", "NH4+ + OH- → NH3 + H2O". In the JSON output, every LaTeX backslash must be escaped, e.g. "\\\\frac", "\\\\sqrt", "\\\\mathrm", "\\\\vec".
                EXAM CONFIGURATION: __REQUEST_CONFIG__
                KNOWLEDGE_JSON: __KNOWLEDGE__
                __RETRY_INSTRUCTION__"""
                .replace("__QUESTION_COUNT__", String.valueOf(batchCount))
                .replace("__QUESTION_TYPE__", type.type())
                .replace("__BATCH_SCORE__", String.valueOf(batchScore))
                .replace("__REQUEST_CONFIG__", objectMapper.writeValueAsString(request))
                .replace("__KNOWLEDGE__", objectMapper.writeValueAsString(knowledge))
                .replace("__RETRY_INSTRUCTION__", compactRetry
                        ? "RETRY: You MUST close every ] and } bracket, and must not add any text outside the JSON."
                        : "");
    }

    private String explanationPrompt(Map<String, String> knowledge, List<PracticeExam.Question> questions, boolean compactRetry) throws Exception {
        String orders = questions.stream().map(question -> String.valueOf(question.order())).collect(Collectors.joining(","));
        return """
                You are a Vietnamese teacher. Use ONLY the provided SGK (textbook) data. Write every explanation in Vietnamese. Return ONLY a JSON array, no markdown and no other text.
                Every element must match this schema: {"order":number,"explanation":"..."}.
                Below are __QUESTION_COUNT__ already-finalized questions, each with its correct answer already decided. For every question, write ONLY an "explanation" that justifies the GIVEN answer — do NOT re-derive, re-check, or change the answer, and do NOT repeat the question content, options, or answer in your output.
                Return EXACTLY one element for each of these order values, no more and no less: __ORDERS__.
                FORMATTING RULES: Every math, physics, or chemistry formula — fractions, roots, exponents/subscripts, reaction equations, vectors, or scientific notation — MUST be written in LaTeX. Inline formulas must sit inside a SINGLE pair of $...$, e.g. "$v_{tb} = \\frac{s}{t}$", "$\\sqrt{5^2 + 5^2}$", "$\\vec{F_1}$". Multi-step calculation solutions MUST be enclosed in a SINGLE $$...$$ block; never split individual commands like \\sqrt, \\cdot, \\cos, \\theta, \\approx, \\Rightarrow across separate lines or blocks. Always write vectors with the correct syntax \\vec{F_1}, \\vec{F_2}; never vecF_1, \\vecF_1, or \\vec F_1. Fractions MUST use braces, e.g. \\frac{1}{2}, \\frac{F}{m}; never \\frac12, frac12, or fracFm. In the JSON output, every LaTeX backslash must be escaped, e.g. "\\\\frac", "\\\\sqrt", "\\\\mathrm", "\\\\vec".
                QUESTIONS_WITH_ANSWERS: __QUESTIONS__
                KNOWLEDGE_JSON: __KNOWLEDGE__
                __RETRY_INSTRUCTION__"""
                .replace("__QUESTION_COUNT__", String.valueOf(questions.size()))
                .replace("__ORDERS__", orders)
                .replace("__QUESTIONS__", objectMapper.writeValueAsString(questions))
                .replace("__KNOWLEDGE__", objectMapper.writeValueAsString(knowledge))
                .replace("__RETRY_INSTRUCTION__", compactRetry
                        ? "RETRY: You MUST close every ] and } bracket, and must not add any text outside the JSON."
                        : "");
    }

    // ---- Repair helpers ----

    private static int proportionalScore(int totalScore, int totalCount, int offset, int count) {
        return Math.floorDiv((offset + count) * totalScore, totalCount) - Math.floorDiv(offset * totalScore, totalCount);
    }

    private static String repairMathText(String value) {
        if (value == null || value.isBlank()) return value;
        String decoded = decodeStrayHtmlEntities(value);
        String repaired = repairDelimitedMath(repairDelimitedMath(decoded, DISPLAY_MATH, "$$", "$$"), INLINE_MATH, "$", "$");
        String[] lines = repaired.split("\\n", -1);
        StringBuilder result = new StringBuilder();
        boolean insideBlockMath = false;
        for (int index = 0; index < lines.length; index++) {
            if (index > 0) result.append('\n');
            String line = lines[index];
            result.append(insideBlockMath ? line : repairUnwrappedLatexLine(line));
            if (countOccurrences(line, "$$") % 2 == 1) insideBlockMath = !insideBlockMath;
        }
        return result.toString();
    }

    private static int countOccurrences(String line, String token) {
        int count = 0;
        int index = 0;
        while ((index = line.indexOf(token, index)) != -1) {
            count++;
            index += token.length();
        }
        return count;
    }

    private static String decodeStrayHtmlEntities(String value) {
        Matcher named = HTML_NAMED_ENTITY.matcher(value);
        StringBuilder afterNamed = new StringBuilder();
        while (named.find()) {
            String replacement = switch (named.group(1)) {
                case "amp" -> "&";
                case "lt" -> "<";
                case "gt" -> ">";
                case "quot" -> "\"";
                default -> "'";
            };
            named.appendReplacement(afterNamed, Matcher.quoteReplacement(replacement));
        }
        named.appendTail(afterNamed);
        Matcher numeric = HTML_NUMERIC_ENTITY.matcher(afterNamed.toString());
        StringBuilder result = new StringBuilder();
        while (numeric.find()) {
            String replacement = switch (numeric.group(1)) {
                case "38" -> "&";
                case "60" -> "<";
                case "62" -> ">";
                case "34" -> "\"";
                default -> "'";
            };
            numeric.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        numeric.appendTail(result);
        return result.toString();
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

    private void validateQuestionStructure(PracticeExam exam, PracticeExamRequest request) {
        if (exam == null || exam.questions() == null || exam.questions().size() != request.totalQuestionCount() || exam.totalScoreCentiPoints() != 1000) throw new IllegalArgumentException("AI trả thiếu câu hỏi hoặc sai tổng điểm.");
        Map<String, PracticeExamRequest.QuestionType> expected = new HashMap<>(); request.questionTypes().forEach(type -> expected.put(type.type(), type));
        Map<String, Integer> counts = new HashMap<>(); Map<String, Integer> scores = new HashMap<>();
        Set<String> allowed = new HashSet<>(); for (PracticeExamRequest.LessonRef ref : request.knowledgeScope().lessonRefs()) allowed.add(request.knowledgeScope().bookCode() + ":" + ref.chapterCode() + ":" + ref.lessonCode());
        for (PracticeExam.Question question : exam.questions()) {
            if (question == null || !expected.containsKey(question.type()) || blank(question.content()) || question.answer() == null || question.sourceLessonRefs() == null || question.sourceLessonRefs().isEmpty()) throw new IllegalArgumentException("AI trả câu hỏi thiếu nội dung, đáp án hoặc nguồn SGK.");
            counts.merge(question.type(), 1, Integer::sum); scores.merge(question.type(), question.scoreCentiPoints(), Integer::sum);
            for (PracticeExam.LessonRef ref : question.sourceLessonRefs()) if (!allowed.contains(ref.bookCode() + ":" + ref.chapterCode() + ":" + ref.lessonCode())) throw new IllegalArgumentException("AI sử dụng kiến thức ngoài phạm vi SGK đã chọn.");
            if ("MULTIPLE_CHOICE".equals(question.type()) && (question.options() == null || question.options().size() != 4)) throw new IllegalArgumentException("Câu trắc nghiệm nhiều lựa chọn phải có 4 phương án.");
            if ("TRUE_FALSE".equals(question.type()) && (question.options() == null || question.options().size() != 4)) throw new IllegalArgumentException("Câu đúng-sai phải có 4 mệnh đề.");
            if ("ESSAY".equals(question.type()) && (question.rubric() == null || question.rubric().stream().mapToInt(PracticeExam.Rubric::scoreCentiPoints).sum() != question.scoreCentiPoints())) {
                throw new IllegalArgumentException("Rubric tự luận không khớp điểm câu.");
            }
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
    private record ExplanationBatchTask(String type, List<PracticeExam.Question> questions) {}
}
