package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.OutlineDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.QuizItemDto;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.presentation.dto.slides.VisualDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class GenerateSlideOutlineUseCase {

    private static final ObjectMapper LENIENT_MAPPER = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);

    /** Số phần expand chạy song song tối đa (khớp SLIDE_CONCURRENCY=4 ở FE). */
    private static final int EXPAND_CONCURRENCY = 4;

    private final AiClient aiClient;
    private final SlidePromptBuilder promptBuilder;
    private final OutlineStreamPort outlineStream;
    private final ExecutorService executor;

    public GenerateSlideOutlineUseCase(
            AiClient aiClient,
            SlidePromptBuilder promptBuilder,
            OutlineStreamPort outlineStream,
            @Qualifier("slideSessionExecutor") ExecutorService executor) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.outlineStream = outlineStream;
        this.executor = executor;
    }

    public GenerateOutlineResponse execute(GenerateOutlineRequest req) {
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(req);
        String sessionId = UUID.randomUUID().toString();
        String topic = "/topic/slides/" + sessionId;
        String outlineTopic = "/topic/outline/" + sessionId;

        // PHA 1 — khung (sync, 1 call nhẹ).
        String structurePrompt = promptBuilder.outlineStructurePrompt(
                lesson, req.plan(), req.userPrompt(), req.styleHint(), req.subject());
        log.info("slide outline structure prompt length={}", structurePrompt.length());
        String rawSkeleton = aiClient.generate(structurePrompt);

        ParsedSkeleton skeleton = parseSkeleton(lesson, rawSkeleton);
        GenerateOutlineResponse response =
                new GenerateOutlineResponse(sessionId, topic, outlineTopic, skeleton.outline());

        // PHA 2 — expand từng phần (nền, stream qua STOMP). Trả response pha 1 trước.
        startExpansion(sessionId, lesson, req, skeleton);
        return response;
    }

    private void startExpansion(
            String sessionId, LessonContext lesson, GenerateOutlineRequest req, ParsedSkeleton skeleton) {
        List<PartDto> parts = skeleton.outline().parts();
        if (skeleton.fallback() || parts.isEmpty()) {
            // Pha 1 lỗi (đã fallback) hoặc không có phần → không expand, báo xong ngay để FE thôi loading.
            outlineStream.publishDone(sessionId, 0);
            return;
        }

        AtomicInteger remaining = new AtomicInteger(parts.size());
        AtomicInteger failures = new AtomicInteger(0);
        Semaphore gate = new Semaphore(EXPAND_CONCURRENCY);

        for (PartDto part : parts) {
            executor.submit(() -> {
                try {
                    gate.acquire();
                    try {
                        String prompt = promptBuilder.expandPartPrompt(
                                lesson, req.plan(), skeleton.skeletonJson(), part.id(), part.title(), req.subject());
                        String raw = aiClient.generate(prompt);
                        List<SlideItemDto> filled = mergeExpanded(part, raw);
                        outlineStream.publishPartReady(sessionId, part.id(), filled);
                    } finally {
                        gate.release();
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                    log.warn("Expand part {} failed: {}", part.id(), e.getMessage());
                    outlineStream.publishPartError(sessionId, part.id(), e.getMessage());
                } finally {
                    if (remaining.decrementAndGet() == 0) {
                        outlineStream.publishDone(sessionId, failures.get());
                    }
                }
            });
        }
    }

    /**
     * Ghép nội dung pha 2 vào khung pha 1 theo {@code slide.id}. Chỉ điền content/notes/duration cho
     * các slide CÓ SẴN trong khung — bỏ qua id lạ (chống drift). Slide thiếu nội dung giữ nguyên khung.
     */
    private List<SlideItemDto> mergeExpanded(PartDto part, String raw) {
        java.util.Map<String, JsonNode> byId = new java.util.HashMap<>();
        try {
            JsonNode root = LENIENT_MAPPER.readTree(SlidePromptBuilder.stripFences(raw));
            for (JsonNode s : root.path("slides")) {
                String id = s.path("id").asText(null);
                if (id != null && !id.isBlank()) byId.put(id, s);
            }
        } catch (Exception e) {
            log.warn("Expand parse failed for part {}, keeping skeleton: {}", part.id(), e.getMessage());
        }

        List<SlideItemDto> result = new ArrayList<>();
        for (SlideItemDto s : part.slides()) {
            JsonNode node = byId.get(s.id());
            if (node == null) {
                result.add(s);
                continue;
            }
            result.add(new SlideItemDto(
                    s.id(), s.title(), s.kind(), s.pedagogicalRole(), s.layoutHint(),
                    textOrNull(node, "content"),
                    intOrNull(node, "durationMinutes"),
                    stringListOrNull(node.path("requiredFacts")),
                    quizItemsOrNull(node.path("quizItems")),
                    visualOrNull(node.path("visual")),
                    textOrNull(node, "aiNote")
            ));
        }
        return result;
    }

    private ParsedSkeleton parseSkeleton(LessonContext lesson, String raw) {
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
                            null,
                            textOrNull(s, "pedagogicalRole"),
                            textOrNull(s, "layoutHint")
                    ));
                }
                parts.add(new PartDto(p.path("id").asText(), p.path("title").asText(), slides));
            }
            boolean hasSlides = parts.stream().anyMatch(p -> !p.slides().isEmpty());
            if (!parts.isEmpty() && hasSlides) {
                return new ParsedSkeleton(new OutlineDto(lesson.id(), lessonTitle, parts), json, false);
            }
            log.warn("Outline structure parsed but has no slides — using fallback");
        } catch (Exception e) {
            log.warn("Outline structure parse failed, using fallback: {}", e.getMessage());
        }
        return new ParsedSkeleton(fallbackOutline(lesson), "", true);
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

    private static VisualDto visualOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.isObject()) return null;
        String type = textOrNull(node, "type");
        String spec = textOrNull(node, "spec");
        if (type == null && spec == null) return null;
        return new VisualDto(type, spec);
    }

    private static List<String> stringListOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.isArray()) return null;
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (item == null || item.isNull()) continue;
            String text = item.asText();
            if (text != null && !text.isBlank()) values.add(text);
        }
        return values.isEmpty() ? null : values;
    }

    private static List<QuizItemDto> quizItemsOrNull(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull() || !node.isArray()) return null;
        List<QuizItemDto> items = new ArrayList<>();
        for (JsonNode item : node) {
            if (item == null || item.isNull() || !item.isObject()) continue;
            String question = textOrNull(item, "question");
            if (question == null) continue;
            items.add(new QuizItemDto(
                    question,
                    stringListOrNull(item.path("choices")),
                    textOrNull(item, "answer"),
                    textOrNull(item, "explanation")
            ));
        }
        return items.isEmpty() ? null : items;
    }

    private static Integer intOrNull(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull() || !value.canConvertToInt()) return null;
        return value.asInt();
    }

    /** Khung pha 1 đã parse + chuỗi JSON gốc (chứa brief) để làm context cho pha 2. */
    private record ParsedSkeleton(OutlineDto outline, String skeletonJson, boolean fallback) {
    }
}
