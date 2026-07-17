package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.ContentPlan;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class GenerateSlideOutlineUseCaseTest {
    @Mock private AiClient aiClient;
    @Mock private OutlineStreamPort outlineStream;

    @Test
    void returnsPedagogicalBlueprintInsteadOfLessonActivityTitles() {
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("KNOWLEDGE MAP")) return blueprint();
            return "{\"chunkId\":\"c1\",\"contentUnits\":[{\"title\":\"Sóng\",\"summary\":\"Kiến thức\"}],\"requiredFacts\":[],\"formulas\":[],\"questionsAndAnswers\":[],\"suggestedSlideRoles\":[\"explain\"]}";
        });
        var response = useCase().execute(request());

        assertEquals(4, response.outline().parts().size());
        assertEquals("Mở đầu vấn đề", response.outline().parts().getFirst().title());
        assertFalse(response.outline().parts().stream().anyMatch(part -> part.title().contains("Hoạt động")));
    }

    @Test
    void insertsSectionSlideWhenPartDoesNotStartWithOpeningSlide() {
        SlideItemDto content = new SlideItemDto("p2s1", "Khái niệm", "explain", null, null,
                new ContentPlan("concept", "fixed", List.of(), List.of()));
        PartDto result = GenerateSlideOutlineUseCase.ensureOpeningSlide(
                new PartDto("p2", "Hình thành kiến thức", List.of(content), List.of("c1")));

        assertEquals(2, result.slides().size());
        assertEquals("p2-section", result.slides().getFirst().id());
        assertEquals("section", result.slides().getFirst().contentPlan().slideType());
        assertEquals("hidden", result.slides().getFirst().contentPlan().headerMode());
    }

    @Test
    void normalizesUnknownContentMapRoleToOther() throws Exception {
        var map = new ObjectMapper().readTree("{\"suggestedSlideRoles\":[\"discuss\",\"explain\",\"other\"]}");

        GenerateSlideOutlineUseCase.normalizeContentMapSuggestedRoles(map);

        assertEquals("other", map.path("suggestedSlideRoles").get(0).asText());
        assertEquals("explain", map.path("suggestedSlideRoles").get(1).asText());
        assertEquals("other", map.path("suggestedSlideRoles").get(2).asText());
    }

    @Test
    void normalizesUnknownSkeletonRoleToOtherWhilePreservingKnownRoles() {
        var skeleton = useCase().parseSkeleton(lesson(), """
                {"parts":[{"id":"p1","title":"Phần một","slides":[
                  {"id":"p1s1","title":"Thảo luận","pedagogicalRole":"discuss","contentPlan":{"slideType":"concept","headerMode":"fixed"}},
                  {"id":"p1s2","title":"Giải thích","pedagogicalRole":"explain","contentPlan":{"slideType":"concept","headerMode":"fixed"}}
                ]}]}
                """, List.of(), false);

        assertEquals(List.of("other", "explain"), skeleton.outline().parts().getFirst().slides().stream()
                .map(SlideItemDto::pedagogicalRole).toList());
    }

    @Test
    void automaticallyReplacesDenseOutlineItemBeforePartIsPublished() {
        when(aiClient.generate(anyString())).thenReturn(splitResponse());
        SlideItemDto dense = new SlideItemDto("p2s3", "Nội dung dài", "explain", null, null,
                new ContentPlan("concept", "fixed", List.of(
                        new ContentPlan.TextBlock("b1", "text", "body", "explanation", "primary", true, null,
                                "x".repeat(451))), List.of()));

        List<SlideItemDto> result = useCase().autoSplitDenseOutlineItems(
                lesson(), request(), new PartDto("p2", "Khám phá", List.of(dense), List.of("c1")), List.of(dense));

        assertEquals(List.of("p2s3-a", "p2s3-b"), result.stream().map(SlideItemDto::id).toList());
        assertEquals(List.of("Ý thứ nhất", "Ý thứ hai"), result.stream().map(SlideItemDto::title).toList());
        assertEquals(List.of("other", "explain"), result.stream().map(SlideItemDto::pedagogicalRole).toList());
        verify(aiClient, times(1)).generate(anyString());
    }

    @Test
    void keepsOriginalOutlineItemWhenAutomaticSplitCannotBeValidated() {
        when(aiClient.generate(anyString())).thenReturn("{\"slides\":[]}");
        SlideItemDto dense = new SlideItemDto("p2s3", "Nội dung dài", "explain", null, null,
                new ContentPlan("concept", "fixed", List.of(
                        new ContentPlan.TextBlock("b1", "text", "body", "explanation", "primary", true, null,
                                "x".repeat(451))), List.of()));

        List<SlideItemDto> result = useCase().autoSplitDenseOutlineItems(
                lesson(), request(), new PartDto("p2", "Khám phá", List.of(dense), List.of("c1")), List.of(dense));

        assertEquals(List.of(dense), result);
        verify(aiClient, times(2)).generate(anyString());
    }

    private GenerateSlideOutlineUseCase useCase() {
        return new GenerateSlideOutlineUseCase(aiClient, new SlidePromptBuilder(), outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));
    }

    private static GenerateOutlineRequest request() {
        return new GenerateOutlineRequest("lesson", "Giao thoa sóng", "", "12", "Vật lí",
                new InlineLessonPlanDto("Giao thoa sóng", 12, 45, List.of(), List.of(),
                        List.of(new InlineActivityDto("a1", "Hoạt động 1", 45, "Hiểu bài", "", "", "")), "", ""),
                null, null, "# Bài\n\nNội dung giao thoa.", "library");
    }

    private static LessonContext lesson() {
        return new LessonContext("lesson", "Giao thoa sóng", 12, "", List.of(), List.of(), List.of(), List.of(), List.of());
    }

    private static String splitResponse() {
        return """
                {"slides":[
                  {"title":"Ý thứ nhất","pedagogicalRole":"discuss","durationMinutes":1,
                   "contentPlan":{"slideType":"concept","headerMode":"fixed","blocks":[
                     {"id":"b1","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"Nội dung thứ nhất"}
                   ],"relationships":[]}},
                  {"title":"Ý thứ hai","pedagogicalRole":"explain","durationMinutes":1,
                   "contentPlan":{"slideType":"concept","headerMode":"fixed","blocks":[
                     {"id":"b2","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"Nội dung thứ hai"}
                   ],"relationships":[]}}
                ]}
                """;
    }

    private static String blueprint() {
        return "{\"chapters\":["
                + "{\"id\":\"p1\",\"title\":\"Mở đầu vấn đề\",\"learningGoal\":\"Gợi vấn đề\",\"slideBudget\":3,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p2\",\"title\":\"Khám phá hiện tượng\",\"learningGoal\":\"Quan sát\",\"slideBudget\":6,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p3\",\"title\":\"Hình thành kiến thức\",\"learningGoal\":\"Giải thích\",\"slideBudget\":7,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p4\",\"title\":\"Luyện tập và củng cố\",\"learningGoal\":\"Vận dụng\",\"slideBudget\":5,\"sourceChunkIds\":[\"c1\"]}]}";
    }
}
