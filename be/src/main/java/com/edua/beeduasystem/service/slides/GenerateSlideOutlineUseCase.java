package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.OutlineDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateSlideOutlineUseCase {

    private static final ObjectMapper LENIENT_MAPPER = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);

    private final AiClient aiClient;
    private final SlidePromptBuilder promptBuilder;

    public GenerateOutlineResponse execute(GenerateOutlineRequest req) {
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(req);
        String prompt = promptBuilder.outlineFromPlanPrompt(
                lesson, req.plan(), req.userPrompt(), req.styleHint());

        log.info("slide outline prompt length={}", prompt.length());
        String raw = aiClient.generate(prompt);
        OutlineDto outline = parseOutline(lesson, raw);

        String sessionId = UUID.randomUUID().toString();
        String topic = "/topic/slides/" + sessionId;
        return new GenerateOutlineResponse(sessionId, topic, outline);
    }

    private OutlineDto parseOutline(LessonContext lesson, String raw) {
        try {
            String json = SlidePromptBuilder.stripFences(raw);
            JsonNode root = LENIENT_MAPPER.readTree(json);
            String lessonTitle = root.path("lessonTitle").asText(lesson.title());
            List<PartDto> parts = new ArrayList<>();
            for (JsonNode p : root.path("parts")) {
                List<SlideItemDto> slides = new ArrayList<>();
                for (JsonNode s : p.path("slides")) {
                    slides.add(new SlideItemDto(
                            s.path("id").asText(),
                            s.path("title").asText(),
                            textOrNull(s, "kind"),
                            textOrNull(s, "pedagogicalRole"),
                            textOrNull(s, "layoutHint"),
                            textOrNull(s, "content")
                    ));
                }
                parts.add(new PartDto(p.path("id").asText(), p.path("title").asText(), slides));
            }
            boolean hasSlides = parts.stream().anyMatch(p -> !p.slides().isEmpty());
            if (!parts.isEmpty() && hasSlides) {
                return new OutlineDto(lesson.id(), lessonTitle, parts);
            }
            log.warn("Outline parsed but has no slides — using fallback");
        } catch (Exception e) {
            log.warn("Outline parse failed, using fallback: {}", e.getMessage());
        }
        return fallbackOutline(lesson);
    }

    private static OutlineDto fallbackOutline(LessonContext lesson) {
        return new OutlineDto(lesson.id(), lesson.title(), List.of(
                new PartDto("p1", "Mở đầu", List.of(
                        new SlideItemDto("p1s1", "Giới thiệu bài học", "intro", "hook", "title")
                )),
                new PartDto("p2", "Nội dung chính", List.of(
                        new SlideItemDto("p2s1", "Khái niệm cơ bản", "concept", "explain", "bullets")
                )),
                new PartDto("p3", "Tổng kết", List.of(
                        new SlideItemDto("p3s1", "Chốt kiến thức", "summary", "recap", "bullets")
                ))
        ));
    }

    private static String textOrNull(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }
}
