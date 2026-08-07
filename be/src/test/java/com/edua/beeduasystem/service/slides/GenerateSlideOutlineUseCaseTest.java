package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.presentation.dto.slides.OutlineDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.RetryOutlinePartRequest;
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

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
    void normalizesComparisonTitlesToComparisonSlides() {
        assertEquals("comparison", GenerateSlideOutlineUseCase.normalizeSkeletonSlideType(
                "concept", "explain", "Phân biệt polymer nhiệt dẻo và nhiệt rắn"));
    }

    @Test
    void rejectsFlatTextForAComparisonSlide() {
        SlideItemDto skeleton = new SlideItemDto("p1s1", "So sánh", "explain", null, null,
                new ContentPlan("comparison", "fixed", List.of(), List.of()));

        assertThrows(IllegalArgumentException.class, () -> GenerateSlideOutlineUseCase.parseExpandedSlide(skeleton, """
                {"slide":{"id":"p1s1","contentPlan":{"blocks":[
                  {"id":"b1","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"A B tiêu chí giá trị"}
                ],"relationships":[]}}}
                """));
    }

    @Test
    void retryPartExpandsEachSlideWithSeparateAiCall() {
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("SLIDE CẦN SOẠN: id=\"p1s1\"")) return singleSlideResponse("p1s1", "Ná»™i dung slide 1");
            if (prompt.contains("SLIDE CẦN SOẠN: id=\"p1s2\"")) return singleSlideResponse("p1s2", "Ná»™i dung slide 2");
            throw new AssertionError("Unexpected prompt: " + prompt);
        });
        SlideItemDto first = new SlideItemDto("p1s1", "Slide 1", "explain", null, null,
                new ContentPlan("concept", "fixed", List.of(), List.of()));
        SlideItemDto second = new SlideItemDto("p1s2", "Slide 2", "practice", null, null,
                new ContentPlan("exercise", "fixed", List.of(), List.of()));
        PartDto part = new PartDto("p1", "Pháº§n 1", List.of(first, second), List.of("c1"));

        useCase().retryPart(new RetryOutlinePartRequest(
                "session-1", request(), new OutlineDto("lesson", "Giao thoa sÃ³ng", List.of(part)), "p1"));

        verify(aiClient, times(2)).generate(anyString());
        verify(outlineStream).publishSlideReady(eq("session-1"), eq("p1"), argThat(slide ->
                slide.id().equals("p1s1") && !slide.contentPlan().blocks().isEmpty()));
        verify(outlineStream).publishSlideReady(eq("session-1"), eq("p1"), argThat(slide ->
                slide.id().equals("p1s2") && !slide.contentPlan().blocks().isEmpty()));
        verify(outlineStream).publishPartReady(eq("session-1"), eq("p1"), argThat(slides ->
                slides.size() == 2
                        && slides.get(0).id().equals("p1s1")
                        && slides.get(1).id().equals("p1s2")
                        && !slides.get(0).contentPlan().blocks().isEmpty()
                        && !slides.get(1).contentPlan().blocks().isEmpty()));
    }

    @Test
    void retryPartPublishesSlideFailureAndContinuesWithNextSlide() {
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("id=\"p1s1\"")) return invalidStringArrayResponse("p1s1");
            if (prompt.contains("id=\"p1s2\"")) return singleSlideResponse("p1s2", "Nội dung slide 2");
            throw new AssertionError("Unexpected prompt: " + prompt);
        });
        SlideItemDto first = new SlideItemDto("p1s1", "Slide 1", "explain", null, null,
                new ContentPlan("quiz", "fixed", List.of(), List.of()));
        SlideItemDto second = new SlideItemDto("p1s2", "Slide 2", "practice", null, null,
                new ContentPlan("exercise", "fixed", List.of(), List.of()));
        PartDto part = new PartDto("p1", "Phần 1", List.of(first, second), List.of("c1"));

        assertThrows(SlideAiResponseException.class, () -> useCase().retryPart(new RetryOutlinePartRequest(
                "session-1", request(), new OutlineDto("lesson", "Giao thoa sóng", List.of(part)), "p1")));

        verify(aiClient, times(3)).generate(anyString());
        verify(outlineStream).publishSlideError(eq("session-1"), eq("p1"), eq("p1s1"), argThat(message ->
                message.contains("String array contains invalid value")));
        verify(outlineStream).publishSlideReady(eq("session-1"), eq("p1"), argThat(slide ->
                slide.id().equals("p1s2") && !slide.contentPlan().blocks().isEmpty()));
        verify(outlineStream).publishPartReady(eq("session-1"), eq("p1"), argThat(slides ->
                slides.size() == 2
                        && slides.get(0).id().equals("p1s1")
                        && slides.get(0).contentPlan().blocks().isEmpty()
                        && slides.get(1).id().equals("p1s2")
                        && !slides.get(1).contentPlan().blocks().isEmpty()));
    }

    @Test
    void consolidateDeckPatchesDuplicatedSlideAndPublishesUpdate() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slides":[{"id":"p1s1","contentPlan":{"blocks":[
                  {"id":"b1","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"Nội dung đã hợp nhất"}
                ],"relationships":[]}}]}
                """);
        SlideItemDto first = new SlideItemDto("p1s1", "Slide 1", "explain", 3, null,
                new ContentPlan("concept", "fixed", List.of(new ContentPlan.TextBlock(
                        "b1", "text", "body", "explanation", "primary", true, null, "Nội dung lặp với slide khác")),
                        List.of()));
        SlideItemDto second = new SlideItemDto("p1s2", "Slide 2", "practice", 3, null,
                new ContentPlan("exercise", "fixed", List.of(new ContentPlan.TextBlock(
                        "b1", "text", "body", "explanation", "primary", true, null, "Nội dung khác")), List.of()));
        PartDto part = new PartDto("p1", "Phần 1", List.of(first, second), List.of("c1"));

        useCase().consolidateDeck("session-1", lesson(), session(part));

        verify(outlineStream).publishSlideReady(eq("session-1"), eq("p1"), argThat(slide ->
                slide.id().equals("p1s1")
                        && ((ContentPlan.TextBlock) slide.contentPlan().blocks().getFirst()).text().equals("Nội dung đã hợp nhất")));
        verify(outlineStream).publishPartReady(eq("session-1"), eq("p1"), argThat(slides ->
                slides.size() == 2 && slides.get(1).id().equals("p1s2")));
    }

    @Test
    void consolidateDeckIsBestEffortAndSwallowsInvalidResponse() {
        when(aiClient.generate(anyString())).thenReturn("not json");
        SlideItemDto first = new SlideItemDto("p1s1", "Slide 1", "explain", 3, null,
                new ContentPlan("concept", "fixed", List.of(new ContentPlan.TextBlock(
                        "b1", "text", "body", "explanation", "primary", true, null, "Nội dung")), List.of()));
        PartDto part = new PartDto("p1", "Phần 1", List.of(first), List.of("c1"));

        useCase().consolidateDeck("session-1", lesson(), session(part));

        verify(outlineStream, never()).publishSlideReady(anyString(), anyString(), any());
        verify(outlineStream, never()).publishPartReady(anyString(), anyString(), any());
    }

    private static OutlineGenerationSessionStore.Session session(PartDto part) {
        GenerateOutlineRequest req = request();
        LessonSourceContext source = LessonSourceContext.from(req, new LessonContentChunker());
        Map<String, PartDto> parts = new ConcurrentHashMap<>(Map.of(part.id(), part));
        return new OutlineGenerationSessionStore.Session(
                req, source, parts, Instant.now().plus(Duration.ofMinutes(30)), true);
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

    private static String singleSlideResponse(String id, String text) {
        return """
                {"slide":{"id":"%s","durationMinutes":2,"aiNote":"","contentPlan":{"blocks":[
                  {"id":"b1","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"%s"}
                ],"relationships":[]}}}
                """.formatted(id, text);
    }

    private static String invalidStringArrayResponse(String id) {
        return """
                {"slide":{"id":"%s","durationMinutes":2,"aiNote":"","contentPlan":{"blocks":[
                  {"id":"b1","kind":"quiz","role":"body","semanticType":"check","priority":"primary","required":true,
                   "question":"Chọn đáp án đúng","choices":["A",123],"answer":"A"}
                ],"relationships":[]}}}
                """.formatted(id);
    }

    private static String blueprint() {
        return "{\"chapters\":["
                + "{\"id\":\"p1\",\"title\":\"Mở đầu vấn đề\",\"learningGoal\":\"Gợi vấn đề\",\"slideBudget\":3,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p2\",\"title\":\"Khám phá hiện tượng\",\"learningGoal\":\"Quan sát\",\"slideBudget\":6,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p3\",\"title\":\"Hình thành kiến thức\",\"learningGoal\":\"Giải thích\",\"slideBudget\":7,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p4\",\"title\":\"Luyện tập và củng cố\",\"learningGoal\":\"Vận dụng\",\"slideBudget\":5,\"sourceChunkIds\":[\"c1\"]}]}";
    }
}
