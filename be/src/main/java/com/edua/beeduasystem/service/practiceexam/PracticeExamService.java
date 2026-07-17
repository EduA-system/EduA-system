package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.domain.model.practiceexam.PracticeExamValidation;
import com.edua.beeduasystem.domain.exception.PracticeExamGenerationException;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.util.*;
import java.util.concurrent.*;

@Service
@Slf4j
public class PracticeExamService {
    private static final Set<String> TYPES = Set.of("MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY");
    private static final int MAX_QUESTIONS_PER_AI_CALL = 3;
    private final TextbookCatalogRepository catalogRepository;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;
    private final long aiTimeoutSeconds;

    public PracticeExamService(TextbookCatalogRepository catalogRepository, AiClient aiClient, ObjectMapper objectMapper,
                               @Value("${app.ai.practice-exam.timeout-seconds:180}") long aiTimeoutSeconds) {
        this.catalogRepository = catalogRepository;
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
        this.aiTimeoutSeconds = aiTimeoutSeconds;
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

    private PracticeExam generateInBatches(PracticeExamRequest request, Map<String, String> knowledge) {
        try {
            List<PracticeExam.Question> questions = new ArrayList<>();
            for (PracticeExamRequest.QuestionType type : request.questionTypes()) {
                int batchLimit = "ESSAY".equals(type.type()) ? 1 : MAX_QUESTIONS_PER_AI_CALL;
                for (int offset = 0; offset < type.questionCount(); offset += batchLimit) {
                    int batchCount = Math.min(batchLimit, type.questionCount() - offset);
                    int batchScore = proportionalScore(type.totalScoreCentiPoints(), type.questionCount(), offset, batchCount);
                    questions.addAll(generateBatch(request, knowledge, type, offset, batchCount, batchScore, questions.size() + 1));
                }
            }
            PracticeExam exam = new PracticeExam(request.title(), "Đọc kỹ từng câu hỏi và trình bày bài làm rõ ràng.",
                    request.durationMinutes(), request.totalScoreCentiPoints(), questions);
            validateExam(exam, request);
            log.info("PRACTICE_EXAM_GENERATION_SUCCEEDED generatedQuestionCount={}", exam.questions().size());
            return exam;
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (TimeoutException exception) {
            throw new PracticeExamGenerationException("AI mất quá " + aiTimeoutSeconds + " giây để tạo đề. Vui lòng giảm số bài SGK hoặc thử lại.", exception);
        } catch (Exception exception) {
            throw new PracticeExamGenerationException("AI không tạo được đề đúng cấu trúc. Vui lòng thử lại.", exception);
        }
    }

    private List<PracticeExam.Question> generateBatch(PracticeExamRequest request, Map<String, String> knowledge,
                                                        PracticeExamRequest.QuestionType type, int offset, int batchCount,
                                                        int batchScore, int firstOrder) throws Exception {
        Exception lastFailure = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                log.info("PRACTICE_EXAM_AI_BATCH_STARTED type={} offset={} count={} score={} attempt={} compactRetry={}",
                        type.type(), offset, batchCount, batchScore, attempt + 1, attempt > 0);
                String raw = generateWithTimeout(batchPrompt(request, knowledge, type, batchCount, batchScore, attempt > 0));
                log.info("PRACTICE_EXAM_AI_RESPONSE_RECEIVED type={} offset={} attempt={} characters={} fenced={}", type.type(),
                        offset, attempt + 1, raw == null ? 0 : raw.length(), raw != null && raw.trim().startsWith("```"));
                List<PracticeExam.Question> generated = objectMapper.readValue(stripFence(raw), new TypeReference<>() {});
                if (generated.size() != batchCount) throw new IllegalArgumentException("AI trả sai số lượng câu trong một lô.");
                List<PracticeExam.Question> normalized = new ArrayList<>();
                for (int index = 0; index < generated.size(); index++) {
                    PracticeExam.Question question = generated.get(index);
                    if (question == null || !type.type().equals(question.type())) {
                        throw new IllegalArgumentException("AI trả sai loại câu hỏi trong một lô.");
                    }
                    int score = proportionalScore(batchScore, batchCount, index, 1);
                    normalized.add(new PracticeExam.Question(firstOrder + index, question.type(), question.content(), question.options(),
                            question.answer(), question.explanation(), score, question.rubric(), question.sourceLessonRefs()));
                }
                return normalized;
            } catch (Exception failure) {
                lastFailure = failure;
                log.warn("PRACTICE_EXAM_AI_BATCH_FAILED type={} offset={} attempt={} failureType={} message={}", type.type(), offset,
                        attempt + 1, failure.getClass().getSimpleName(), failure.getMessage());
            }
        }
        throw lastFailure == null ? new IllegalStateException("AI không trả kết quả cho một lô câu hỏi.") : lastFailure;
    }

    private String generateWithTimeout(String prompt) throws Exception {
        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            return executor.submit(() -> aiClient.generate(prompt)).get(aiTimeoutSeconds, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }
    }

    private void validateStructure(PracticeExamRequest request) {
        if (request == null || blank(request.subject()) || request.grade() == null || request.grade() < 1 || request.durationMinutes() == null || request.durationMinutes() <= 0) throw new IllegalArgumentException("Thiếu môn, lớp hoặc thời lượng hợp lệ.");
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
        double working = request.durationMinutes() * .85;
        String status = total > request.durationMinutes() ? "INFEASIBLE" : total > working ? "WARNING" : "FEASIBLE";
        String message = switch (status) { case "INFEASIBLE" -> "Cấu hình cần khoảng %.1f phút nhưng thời lượng đề chỉ là %d phút.".formatted(total, request.durationMinutes()); case "WARNING" -> "Thời lượng ước tính %.1f phút, cao hơn ngưỡng an toàn %.1f phút.".formatted(total, working); default -> "Cấu hình phù hợp với thời lượng đã chọn."; };
        return new PracticeExamValidation(status, total, working, Math.max(0, total - working), message, breakdown);
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
                QUY TẮC ĐỊNH DẠNG: Chỉ dùng văn bản thường cho nội dung diễn đạt, phương án A/B/C/D là chữ, và đơn vị đơn giản như "100 m", "10 phút". Mọi công thức toán, vật lí, hoá học; phân số, căn, mũ/chỉ số, phương trình phản ứng, vector hoặc ký hiệu khoa học PHẢI viết bằng LaTeX. Công thức trong câu đặt trong MỘT cặp $...$ duy nhất, ví dụ "$v_{tb} = \\frac{s}{t}$", "$\\sqrt{5^2 + 5^2}$", "$\\vec{F_1}$", "$N_2$"; không được đóng $ trước khi công thức kết thúc. Lời giải tính toán nhiều bước PHẢI nằm trọn trong MỘT khối $$...$$ duy nhất; không được tách từng lệnh \\sqrt, \\cdot, \\cos, \\theta, \\approx, \\Rightarrow thành dòng hay thành nhiều khối. Luôn viết vector đúng cú pháp \\vec{F_1}, \\vec{F_2}; không viết vecF_1, \\vecF_1 hoặc \\vec F_1. Không viết công thức dạng văn bản thường như "v = s/t", "sqrt(5^2 + 5^2)", "NH4+ + OH- → NH3 + H2O". Trong JSON, phải escape mọi dấu gạch chéo ngược của LaTeX, ví dụ "\\\\frac", "\\\\sqrt", "\\\\mathrm", "\\\\vec".
                CẤU HÌNH ĐỀ: __REQUEST_CONFIG__
                KNOWLEDGE_JSON: __KNOWLEDGE__
                __RETRY_INSTRUCTION__"""
                .replace("__QUESTION_COUNT__", String.valueOf(batchCount))
                .replace("__QUESTION_TYPE__", type.type())
                .replace("__BATCH_SCORE__", String.valueOf(batchScore))
                .replace("__REQUEST_CONFIG__", objectMapper.writeValueAsString(request))
                .replace("__KNOWLEDGE__", objectMapper.writeValueAsString(knowledge))
                .replace("__RETRY_INSTRUCTION__", compactRetry
                        ? "LẦN THỬ LẠI: Bắt buộc đóng đủ mọi dấu ] } và không thêm văn bản ngoài JSON."
                        : "");
    }

    private static int proportionalScore(int totalScore, int totalCount, int offset, int count) {
        return Math.floorDiv((offset + count) * totalScore, totalCount) - Math.floorDiv(offset * totalScore, totalCount);
    }

    private void validateExam(PracticeExam exam, PracticeExamRequest request) {
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
            if ("ESSAY".equals(question.type()) && (question.rubric() == null || question.rubric().stream().mapToInt(PracticeExam.Rubric::scoreCentiPoints).sum() != question.scoreCentiPoints())) throw new IllegalArgumentException("Rubric tự luận không khớp điểm câu.");
        }
        for (PracticeExamRequest.QuestionType type : request.questionTypes()) {
            if (counts.getOrDefault(type.type(), 0) != type.questionCount()
                    || scores.getOrDefault(type.type(), 0) != type.totalScoreCentiPoints()) {
                log.warn("PRACTICE_EXAM_AGGREGATE_NORMALIZED type={} expectedCount={} actualCount={} expectedScore={} actualScore={}",
                        type.type(), type.questionCount(), counts.getOrDefault(type.type(), 0),
                        type.totalScoreCentiPoints(), scores.getOrDefault(type.type(), 0));
            }
        }
    }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String stripFence(String raw) { if (raw == null) return ""; String value = raw.trim(); if (!value.startsWith("```")) return value; int start = value.indexOf('\n'); value = start < 0 ? "" : value.substring(start + 1); return value.endsWith("```") ? value.substring(0, value.length() - 3).trim() : value.trim(); }
}
