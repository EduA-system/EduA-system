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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
                        {"id": "p1s1", "title": "Hook", "pedagogicalRole": "hook", "layoutHint": "title", "brief": "Bìa"}
                      ]
                    }
                  ]
                }
                """);

        var useCase = new GenerateSlideOutlineUseCase(
                aiClient, promptBuilder, outlineStream, Executors.newSingleThreadExecutor());

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
                        {"id": "p1s1", "title": "Trắc nghiệm", "pedagogicalRole": "practice", "layoutHint": "bullets"}
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
                      "content": "Trắc nghiệm củng cố",
                      "durationMinutes": 5,
                      "requiredFacts": ["Tốc độ phản ứng là C"],
                      "quizItems": [
                        {
                          "question": "Tốc độ phản ứng là gì?",
                          "choices": ["A. ...", "B. ...", "C. Độ biến thiên nồng độ trong một đơn vị thời gian"],
                          "answer": "C",
                          "explanation": "Theo định nghĩa tốc độ phản ứng."
                        }
                      ],
                      "visual": {"type": "none", "spec": ""},
                      "aiNote": ""
                    }
                  ]
                }
                """);

        var useCase = new GenerateSlideOutlineUseCase(
                aiClient, promptBuilder, outlineStream, Executors.newSingleThreadExecutor());

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
        assertEquals(List.of("Tốc độ phản ứng là C"), slide.requiredFacts());
        assertEquals("Tốc độ phản ứng là gì?", slide.quizItems().get(0).question());
        assertEquals("C", slide.quizItems().get(0).answer());
    }
}
