package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.SlideBackground;
import com.edua.beeduasystem.domain.model.slide.SlideElement;
import com.edua.beeduasystem.domain.model.slide.SlideItem;
import com.edua.beeduasystem.domain.model.slide.SlideOutline;
import com.edua.beeduasystem.domain.model.slide.SlidePart;
import com.edua.beeduasystem.domain.model.slide.SlideVisual;
import com.edua.beeduasystem.domain.model.slide.QuizItem;
import com.edua.beeduasystem.infrastructure.messaging.SlideAiDiagnosticsBridge;
import com.edua.beeduasystem.presentation.dto.slides.GeneratePartsRequest;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.SlideStreamPort;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class GenerateSlideDeckUseCase {

    private static final ObjectMapper LENIENT_MAPPER = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);

    private static final TypeReference<List<SlideElement>> ELEMENTS_TYPE = new TypeReference<>() {};

    private final AiClient aiClient;
    private final SlideStreamPort slideStream;
    private final SlidePromptBuilder promptBuilder;
    private final ExecutorService slideSessionExecutor;
    private final SlideAiDiagnosticsBridge aiDiagnostics;

    public GenerateSlideDeckUseCase(
            AiClient aiClient,
            SlideStreamPort slideStream,
            SlidePromptBuilder promptBuilder,
            @Qualifier("slideSessionExecutor") ExecutorService slideSessionExecutor,
            SlideAiDiagnosticsBridge aiDiagnostics) {
        this.aiClient = aiClient;
        this.slideStream = slideStream;
        this.promptBuilder = promptBuilder;
        this.slideSessionExecutor = slideSessionExecutor;
        this.aiDiagnostics = aiDiagnostics;
    }

    public void start(GeneratePartsRequest req) {
        slideSessionExecutor.submit(() -> run(req));
    }

    private void run(GeneratePartsRequest req) {
        try {
            LessonContext lesson = SlideLessonContextFactory.fromPartsRequest(
                    req.lessonId(), req.lessonTitle(), req.lessonSummary(), req.grade());

            SlideOutline outline = new SlideOutline(
                    lesson.id(),
                    lesson.title(),
                    req.parts().stream()
                            .map(p -> new SlidePart(p.id(), p.title(),
                                    p.slides().stream()
                                            .map(s -> new SlideItem(
                                                    s.id(), s.title(), s.kind(),
                                                    s.pedagogicalRole(), s.layoutHint()))
                                            .toList()))
                            .toList()
            );

            int totalSlides = req.parts().stream().mapToInt(p -> p.slides().size()).sum();
            AtomicInteger failures = new AtomicInteger(0);
            AtomicInteger completed = new AtomicInteger(0);

            for (PartDto section : req.parts()) {
                SlidePart sectionDomain = new SlidePart(section.id(), section.title(),
                        section.slides().stream()
                                .map(s -> new SlideItem(
                                        s.id(), s.title(), s.kind(),
                                        s.pedagogicalRole(), s.layoutHint()))
                                .toList());

                for (SlideItemDto slideDto : section.slides()) {
                    SlideVisual visual = slideDto.visual() == null
                            ? null
                            : new SlideVisual(slideDto.visual().type(), slideDto.visual().spec());
                    SlideItem slide = new SlideItem(
                            slideDto.id(), slideDto.title(), slideDto.kind(),
                            slideDto.pedagogicalRole(), slideDto.layoutHint(),
                            slideDto.content(), slideDto.requiredFacts(),
                            slideDto.quizItems() == null
                                    ? null
                                    : slideDto.quizItems().stream()
                                            .map(q -> new QuizItem(
                                                    q.question(), q.choices(), q.answer(), q.explanation()))
                                            .toList(),
                            visual);
                    slideSessionExecutor.submit(() -> aiDiagnostics.runInContext(req.sessionId(), slide.id(), () -> {
                        try {
                            slideStream.publishLog(
                                    req.sessionId(),
                                    "info",
                                    "GenerateSlideDeck",
                                    "Bắt đầu sinh slide role=" + slide.pedagogicalRole(),
                                    slide.id());

                            String prompt = promptBuilder.slidePrompt(
                                    lesson, outline, sectionDomain, slide,
                                    req.userPrompt(), req.styleHint());
                            log.info("[ai] slide={} role={} prompt_len={}",
                                    slide.id(), slide.pedagogicalRole(), prompt.length());

                            String raw = aiClient.generate(prompt);
                            String stripped = SlidePromptBuilder.stripFences(raw);

                            JsonNode root = LENIENT_MAPPER.readTree(stripped);
                            JsonNode elementsNode = root.path("elements");
                            JsonNode bgNode = root.path("background");
                            if (!elementsNode.isArray()) {
                                throw new IllegalStateException("AI did not return elements array");
                            }
                            List<SlideElement> elements = LENIENT_MAPPER.convertValue(elementsNode, ELEMENTS_TYPE);
                            SlideBackground background = bgNode.isMissingNode() || bgNode.isNull()
                                    ? null
                                    : LENIENT_MAPPER.convertValue(bgNode, SlideBackground.class);

                            List<SlideElement> resolved = stripImageSrc(elements);
                            slideStream.publishPart(req.sessionId(), slide.id(), resolved, background);
                        } catch (Exception e) {
                            log.warn("Slide {} failed for session {}: {}", slide.id(), req.sessionId(), e.getMessage());
                            slideStream.publishPartError(req.sessionId(), slide.id(), e.getMessage());
                            failures.incrementAndGet();
                        } finally {
                            if (completed.incrementAndGet() == totalSlides) {
                                slideStream.publishDone(req.sessionId(), failures.get(), null);
                            }
                        }
                    }));
                }
            }

            if (totalSlides == 0) {
                slideStream.publishDone(req.sessionId(), 0, null);
            }

        } catch (Exception e) {
            log.error("Slide parts generation failed for session {}", req.sessionId(), e);
            slideStream.publishFailed(req.sessionId(), e.getMessage());
        }
    }

    /** MVP: keep imagePrompt, clear src so FE shows placeholder. */
    private List<SlideElement> stripImageSrc(List<SlideElement> elements) {
        List<SlideElement> out = new ArrayList<>(elements.size());
        for (SlideElement el : elements) {
            if (el instanceof SlideElement.Image img) {
                out.add(new SlideElement.Image(
                        img.id(), img.x(), img.y(), img.width(), img.height(),
                        img.rotation(), img.zIndex(), img.locked(),
                        null,
                        img.alt() != null ? img.alt() : img.imagePrompt(),
                        img.fit(),
                        img.imagePrompt()
                ));
            } else {
                out.add(el);
            }
        }
        return out;
    }
}
