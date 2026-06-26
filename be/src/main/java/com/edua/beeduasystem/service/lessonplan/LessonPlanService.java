package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.LessonPlan5512Dto;
import com.edua.beeduasystem.presentation.dto.lessonplan.Objectives;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Sinh giáo án 5512 — hiện chỉ phần I. MỤC TIÊU (đồng bộ, chưa lưu DB).
 *
 * <p>Luồng: lấy {@code knowledge_json} của bài → dựng prompt → gọi {@link AiClient}
 * → parse JSON thành {@link Objectives} → trả về. Lỗi input map 400; lỗi AI/parse
 * map 502 qua {@code GlobalExceptionHandler}.
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
    public LessonPlan5512Dto generateObjectives(GenerateLessonPlanRequest request) {
        validate(request);

        String knowledge = catalogRepository
                .findLessonKnowledge(request.bookId(), request.chapterId(), request.lessonId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Bài học chưa có nội dung số hóa (knowledge_json) để sinh giáo án."));

        String prompt = promptBuilder.buildObjectivesPrompt(knowledge, request.userPrompt());

        String raw;
        try {
            raw = aiClient.generate(prompt);
        } catch (RuntimeException e) {
            throw new LessonPlanGenerationException("AI không sinh được mục tiêu giáo án.", e);
        }

        Objectives objectives = parseObjectives(raw);
        return new LessonPlan5512Dto(null, objectives);
    }

    private void validate(GenerateLessonPlanRequest request) {
        if (isBlank(request.bookId()) || isBlank(request.chapterId()) || isBlank(request.lessonId())) {
            throw new IllegalArgumentException("Thiếu bookId/chapterId/lessonId.");
        }
    }

    private Objectives parseObjectives(String raw) {
        String json = stripJsonFence(raw);
        try {
            return objectMapper.readValue(json, Objectives.class);
        } catch (Exception e) {
            log.warn("Parse objectives thất bại. Output AI: {}", raw);
            throw new LessonPlanGenerationException("Kết quả AI không đúng định dạng mục tiêu.", e);
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
