package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.ArgumentMatchers.contains;

@ExtendWith(MockitoExtension.class)
class GenerateSlideOutlineUseCaseTest {

    @Mock
    private AiClient aiClient;

    @Mock
    private SlidePromptBuilder promptBuilder;

    @Mock
    private OutlineStreamPort outlineStream;

    @Test
    void parsesValidOutlineFromAi() {
        when(promptBuilder.outlineStructurePrompt(any(LessonContext.class), any(), any(), any(), any()))
                .thenReturn("prompt");
        // Pha 2 (expand) chạy nền với cùng mock — không ảnh hưởng response pha 1.
        lenient().when(promptBuilder.expandPartPrompt(any(LessonContext.class), any(), any(), any(), any(), any()))
                .thenReturn("expand");
        when(aiClient.generate(anyString())).thenReturn("""
                {
                  "lessonTitle": "Định luật II Newton",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Mở đầu",
                      "slides": [
                        {"id": "p1s1", "title": "Hook", "pedagogicalRole": "hook", "brief": "Bìa", "contentPlan":{"slideType": "intro", "headerMode": "hidden"}}
                      ]
                    }
                  ]
                }
                """);

        var useCase = new GenerateSlideOutlineUseCase(
                aiClient, promptBuilder, outlineStream, Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));

        var req = new GenerateOutlineRequest(
                "newton-2",
                "Định luật II Newton",
                "F = ma",
                "Lớp 10",
                "Vật lý",
                new InlineLessonPlanDto(
                        "Định luật II Newton",
                        10,
                        45,
                        List.of("Hiểu F = ma"),
                        List.of("Thuyết trình"),
                        List.of(new InlineActivityDto("a1", "Khởi động", 10, "Mở bài", "", "", "")),
                        "",
                        ""),
                null,
                "Tối giản");

        var res = useCase.execute(req);

        assertFalse(res.sessionId().isBlank());
        assertEquals("/topic/slides/" + res.sessionId(), res.topic());
        assertEquals("/topic/outline/" + res.sessionId(), res.outlineTopic());
        assertEquals("Định luật II Newton", res.outline().lessonTitle());
        assertEquals(1, res.outline().parts().size());
        assertEquals("p1s1", res.outline().parts().get(0).slides().get(0).id());
    }

    @Test
    void usesLessonContentAsTheAuthoritativeSourceWhenProvided() {
        when(promptBuilder.outlineStructurePrompt(any(LessonContext.class), any(), any(), any(), any()))
                .thenReturn("structure");
        when(aiClient.generate(contains("DỮ KIỆN GIÁO ÁN ĐÃ SỬA"))).thenReturn("""
                {"lessonTitle":"Bài mới","parts":[{"id":"p1","title":"Bìa","sourceChunkIds":["c1"],"slides":[
                {"id":"p1s1","title":"Bài mới","pedagogicalRole":"hook","contentPlan":{"slideType":"intro","headerMode":"hidden"}}]}]}
                """);

        var useCase = new GenerateSlideOutlineUseCase(aiClient, promptBuilder, outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));
        useCase.execute(new GenerateOutlineRequest("library-id", "Bài mới", "", "10", "Vật lý", null,
                null, null, "DỮ KIỆN GIÁO ÁN ĐÃ SỬA", "content-id"));

        verify(aiClient, atLeastOnce()).generate(contains("DỮ KIỆN GIÁO ÁN ĐÃ SỬA"));
    }

    @Test
    void parsesExpandedSlideSchemaFields() throws Exception {
        when(promptBuilder.outlineStructurePrompt(any(LessonContext.class), any(), any(), any(), any()))
                .thenReturn("structure");
        when(promptBuilder.expandPartPrompt(any(LessonContext.class), any(), any(), any(), any(), any()))
                .thenReturn("expand");
        when(aiClient.generate("structure")).thenReturn("""
                {
                  "lessonTitle": "Bài 19",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Luyện tập",
                      "slides": [
                        {"id": "p1s1", "title": "Trắc nghiệm", "pedagogicalRole": "practice", "slideType": "quiz", "headerMode": "fixed"}
                      ]
                    }
                  ]
                }
                """);
        when(aiClient.generate("expand")).thenReturn("""
                {
                  "slides": [
                    {
                      "id": "p1s1",
                      "durationMinutes": 5,
                      "contentPlan":{"blocks": [{
                        "id":"quiz-1","kind":"quiz","role":"body","semanticType":"quiz","priority":"primary","required":true,
                        "question":"Tốc độ phản ứng là gì?",
                        "choices":["A. ...","B. ...","C. Độ biến thiên nồng độ trong một đơn vị thời gian"],
                        "answer":"C","explanation":"Theo định nghĩa tốc độ phản ứng."
                      }],
                      "relationships": []},
                      "aiNote": ""
                    }
                  ]
                }
                """);

        var useCase = new GenerateSlideOutlineUseCase(
                aiClient, promptBuilder, outlineStream, Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));

        var req = new GenerateOutlineRequest(
                "bai19",
                "Bài 19",
                "",
                "Lớp 10",
                "Hóa học",
                new InlineLessonPlanDto(
                        "Bài 19",
                        10,
                        45,
                        List.of("Hiểu tốc độ phản ứng"),
                        List.of("Trắc nghiệm"),
                        List.of(new InlineActivityDto("a1", "Luyện tập", 5, "Củng cố", "", "", "")),
                        "",
                        ""),
                null,
                "Tối giản");

        var res = useCase.execute(req);

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<com.edua.beeduasystem.presentation.dto.slides.SlideItemDto>> captor =
                org.mockito.ArgumentCaptor.forClass(List.class);
        verify(outlineStream, timeout(TimeUnit.SECONDS.toMillis(2)))
                .publishPartReady(org.mockito.ArgumentMatchers.eq(res.sessionId()),
                        org.mockito.ArgumentMatchers.eq("p1"), captor.capture());

        var slide = captor.getValue().get(0);
        var quiz = (com.edua.beeduasystem.domain.model.slide.ContentPlan.QuizBlock) slide.contentPlan().blocks().getFirst();
        assertEquals("Tốc độ phản ứng là gì?", quiz.question());
        assertEquals("C", quiz.answer());
    }

    @Test
    void retriesTruncatedOutlineJsonExactlyOnce() {
        SlidePromptBuilder realPromptBuilder = new SlidePromptBuilder();
        AtomicInteger outlineAttempts = new AtomicInteger();
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("SOẠN NỘI DUNG CHI TIẾT")) return expandedTextResponse("p1s1");
            if (outlineAttempts.incrementAndGet() == 1) return "{\"lessonTitle\":\"Bài\",\"parts\":[";
            return skeletonResponse(List.of("c1"));
        });
        var useCase = new GenerateSlideOutlineUseCase(aiClient, realPromptBuilder, outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));

        var response = useCase.execute(requestWithContent("# Bài\n\nNội dung ngắn."));

        assertEquals(2, outlineAttempts.get());
        assertEquals(List.of("c1"), response.outline().parts().getFirst().sourceChunkIds());
    }

    @Test
    void repairsPracticeWhenAiUsesPedagogicalRoleAsSlideType() {
        assertEquals("exercise", GenerateSlideOutlineUseCase.normalizeSkeletonSlideType(
                "practice", "practice", "Bài tập vận dụng"));
        assertEquals("quiz", GenerateSlideOutlineUseCase.normalizeSkeletonSlideType(
                "practice", "practice", "Trắc nghiệm củng cố"));
        assertEquals("concept", GenerateSlideOutlineUseCase.normalizeSkeletonSlideType(
                "concept", "explain", "Khái niệm"));
    }

    @Test
    void reportsBadGatewayExceptionAfterSecondInvalidOutlineResponse() {
        SlidePromptBuilder realPromptBuilder = new SlidePromptBuilder();
        when(aiClient.generate(anyString())).thenReturn("{\"lessonTitle\":");
        var useCase = new GenerateSlideOutlineUseCase(aiClient, realPromptBuilder, outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));

        SlideAiResponseException error = assertThrows(SlideAiResponseException.class,
                () -> useCase.execute(requestWithContent("# Bài\n\nNội dung ngắn.")));

        assertTrue(error.getMessage().contains("outline"));
        assertTrue(error.getMessage().contains("2 lần"));
        verify(aiClient, times(2)).generate(anyString());
    }

    @Test
    void mapsLongLessonInChunksAndMergesMapsInSourceOrder() {
        SlidePromptBuilder realPromptBuilder = new SlidePromptBuilder();
        LessonContentChunker smallChunker = new LessonContentChunker(140, 190);
        String source = "# Bài\n\n## Một\n\n" + "Dữ kiện một. ".repeat(10)
                + "\n\n## Hai\n\n" + "Dữ kiện hai. ".repeat(10)
                + "\n\n## Ba\n\n" + "Dữ kiện ba. ".repeat(10);
        List<String> ids = smallChunker.chunk(source).stream().map(LessonContentChunker.Chunk::id).toList();
        AtomicBoolean mapsWereOrdered = new AtomicBoolean();
        AtomicInteger firstMapAttempts = new AtomicInteger();
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("lập bản đồ nội dung nguồn")) {
                String id = ids.stream().filter(candidate -> prompt.contains("CHUNK " + candidate + ":")).findFirst().orElseThrow();
                if (id.equals("c1") && firstMapAttempts.incrementAndGet() == 1) return "{\"chunkId\":\"c1\"";
                return contentMapResponse(id);
            }
            if (prompt.contains("BẢN ĐỒ NỘI DUNG THEO ĐÚNG THỨ TỰ CHUNK")) {
                int previous = -1;
                boolean ordered = true;
                for (String id : ids) {
                    int index = prompt.indexOf("\"chunkId\":\"" + id + "\"");
                    ordered &= index > previous;
                    previous = index;
                }
                mapsWereOrdered.set(ordered);
                return skeletonResponse(ids);
            }
            if (prompt.contains("SOẠN NỘI DUNG CHI TIẾT")) return expandedTextResponse("p1s1");
            throw new AssertionError("Unexpected AI phase");
        });
        var useCase = new GenerateSlideOutlineUseCase(aiClient, realPromptBuilder, outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()), smallChunker);

        var response = useCase.execute(requestWithContent(source));

        assertTrue(ids.size() > 1);
        assertTrue(mapsWereOrdered.get());
        assertEquals(ids, response.outline().parts().getFirst().sourceChunkIds());
        assertEquals(2, firstMapAttempts.get());
        verify(aiClient, times(ids.size() + 1)).generate(contains("lập bản đồ nội dung nguồn"));
    }

    @Test
    void retryPartUsesSameSnapshotAndRecoversOnSecondExpandJsonAttempt() {
        SlidePromptBuilder realPromptBuilder = new SlidePromptBuilder();
        AtomicInteger attempts = new AtomicInteger();
        when(aiClient.generate(anyString())).thenAnswer(invocation ->
                attempts.incrementAndGet() == 1 ? "{\"slides\":[" : expandedTextResponse("p1s1"));
        var useCase = new GenerateSlideOutlineUseCase(aiClient, realPromptBuilder, outlineStream,
                Executors.newThreadPerTaskExecutor(Thread.ofVirtual().factory()));
        var slide = new com.edua.beeduasystem.presentation.dto.slides.SlideItemDto(
                "p1s1", "Nội dung", "explain", null, null,
                new com.edua.beeduasystem.domain.model.slide.ContentPlan("concept", "fixed", List.of(), List.of()));
        var part = new com.edua.beeduasystem.presentation.dto.slides.PartDto("p1", "Nội dung", List.of(slide), List.of("c1"));
        var outline = new com.edua.beeduasystem.presentation.dto.slides.OutlineDto("lesson", "Bài", List.of(part));
        var request = new com.edua.beeduasystem.presentation.dto.slides.RetryOutlinePartRequest(
                "session", requestWithContent("# Bài\n\nSNAPSHOT DUY NHẤT"), outline, "p1");

        useCase.retryPart(request);

        assertEquals(2, attempts.get());
        verify(aiClient, times(2)).generate(contains("SNAPSHOT DUY NHẤT"));
        verify(outlineStream).publishPartReady(org.mockito.ArgumentMatchers.eq("session"),
                org.mockito.ArgumentMatchers.eq("p1"), any());
    }

    @Test
    void routesExpansionToReferencedChunksAndUsesTwoClosestForUserAddedPart() {
        LessonContentChunker chunker = new LessonContentChunker(70, 100);
        String source = "# Bài\n\n## Khởi động\n\n" + "Mở đầu. ".repeat(8)
                + "\n\n## Công thức Newton\n\n" + "F bằng ma. ".repeat(8)
                + "\n\n## Luyện tập\n\n" + "Bài tập. ".repeat(8);
        var chunks = chunker.chunk(source);
        String targetId = chunks.stream().filter(chunk -> String.join(" ", chunk.headingPath()).contains("Newton"))
                .findFirst().orElseThrow().id();

        var referenced = GenerateSlideOutlineUseCase.selectChunks(
                new com.edua.beeduasystem.presentation.dto.slides.PartDto("p", "Tùy ý", List.of(), List.of(targetId)), chunks);
        var fallback = GenerateSlideOutlineUseCase.selectChunks(
                new com.edua.beeduasystem.presentation.dto.slides.PartDto("new", "Công thức Newton", List.of(), null), chunks);

        assertEquals(List.of(targetId), referenced.stream().map(LessonContentChunker.Chunk::id).toList());
        assertEquals(2, fallback.size());
        assertTrue(fallback.stream().anyMatch(chunk -> chunk.id().equals(targetId)));
    }

    private static GenerateOutlineRequest requestWithContent(String content) {
        return new GenerateOutlineRequest("lesson", "Bài", "", "10", "Vật lý", null,
                null, null, content, "library-snapshot");
    }

    private static String contentMapResponse(String id) {
        return "{\"chunkId\":\"" + id + "\",\"contentUnits\":[],\"requiredFacts\":[],\"formulas\":[],"
                + "\"questionsAndAnswers\":[],\"suggestedSlideRoles\":[]}";
    }

    private static String skeletonResponse(List<String> ids) throws Exception {
        String chunkIds = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(ids);
        return "{\"lessonTitle\":\"Bài\",\"parts\":[{\"id\":\"p1\",\"title\":\"Nội dung\","
                + "\"sourceChunkIds\":" + chunkIds + ",\"slides\":[{\"id\":\"p1s1\",\"title\":\"Nội dung\","
                + "\"pedagogicalRole\":\"explain\",\"contentPlan\":{\"slideType\":\"concept\",\"headerMode\":\"fixed\"}}]}]}";
    }

    private static String expandedTextResponse(String slideId) {
        return "{\"slides\":[{\"id\":\"" + slideId + "\",\"contentPlan\":{\"blocks\":[{\"id\":\"b1\","
                + "\"kind\":\"text\",\"role\":\"body\",\"semanticType\":\"explanation\",\"priority\":\"primary\","
                + "\"required\":true,\"text\":\"Nội dung\"}],\"relationships\":[]}}]}";
    }
}
