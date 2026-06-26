package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.domain.model.lessonplan.Materials;
import com.edua.beeduasystem.domain.model.lessonplan.Objectives;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Sinh giáo án 5512 — hiện có phần I. MỤC TIÊU và II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
 * (đồng bộ, mỗi phần một call, chưa lưu DB).
 *
 * <p>Luồng: lấy {@code knowledge_json} của bài → dựng prompt → gọi {@link AiClient}
 * → parse JSON thành DTO → trả về. Lỗi input map 400; lỗi AI/parse map 502 qua
 * {@code GlobalExceptionHandler}.
 */
@Slf4j
@Service
public class LessonPlanService {

    private final TextbookCatalogRepository catalogRepository;
    private final AiClient aiClient;
    private final LessonPlan5512PromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;

    public LessonPlanService(TextbookCatalogRepository catalogRepository,
                             AiClient aiClient,
                             LessonPlan5512PromptBuilder promptBuilder,
                             ObjectMapper objectMapper) {
        this.catalogRepository = catalogRepository;
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
    }

    /** Sinh phần I. MỤC TIÊU cho bài đã chọn. */
    public LessonPlan5512 generateObjectives(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildObjectivesPrompt(knowledge, request.userPrompt());
        String raw = generate(prompt, "AI không sinh được mục tiêu giáo án.");

        Objectives objectives = parseJson(raw, Objectives.class, "Kết quả AI không đúng định dạng mục tiêu.");
        return new LessonPlan5512(null, objectives, null);
    }

    /** Sinh phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU cho bài đã chọn. */
    public LessonPlan5512 generateMaterials(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildMaterialsPrompt(knowledge, request.userPrompt());
        String raw = generate(prompt, "AI không sinh được thiết bị và học liệu.");

        Materials materials = parseJson(raw, Materials.class, "Kết quả AI không đúng định dạng thiết bị và học liệu.");
        return new LessonPlan5512(null, null, materials);
    }

    /** Validate request và lấy nội dung SGK số hóa của bài. */
    private String loadKnowledge(GenerateLessonPlanRequest request) {
        validate(request);
        return catalogRepository
                .findLessonKnowledge(request.bookId(), request.chapterId(), request.lessonId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Bài học chưa có nội dung số hóa (knowledge_json) để sinh giáo án."));
    }

    /** Gọi AI, bọc lỗi runtime thành {@link LessonPlanGenerationException} (→ 502). */
    private String generate(String prompt, String errorMessage) {
        try {
            return aiClient.generate(prompt);
        } catch (RuntimeException e) {
            throw new LessonPlanGenerationException(errorMessage, e);
        }
    }

    private void validate(GenerateLessonPlanRequest request) {
        if (isBlank(request.bookId()) || isBlank(request.chapterId()) || isBlank(request.lessonId())) {
            throw new IllegalArgumentException("Thiếu bookId/chapterId/lessonId.");
        }
    }

    /** Parse output AI thành DTO; lỗi định dạng map 502 với thông điệp riêng từng phần. */
    private <T> T parseJson(String raw, Class<T> type, String errorMessage) {
        String json = stripJsonFence(raw);
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            log.warn("Parse {} thất bại. Output AI: {}", type.getSimpleName(), raw);
            throw new LessonPlanGenerationException(errorMessage, e);
        }
    }

    /** Bỏ rào ```json ... ``` nếu model bọc output trong code fence. */
    private String stripJsonFence(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline >= 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
