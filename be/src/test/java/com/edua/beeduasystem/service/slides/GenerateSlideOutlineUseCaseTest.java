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

    @Test
    void expandsOneSkeletonSlideIntoMultipleChildSlides() {
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
                      "title": "Ứng dụng",
                      "slides": [
                        {"id": "p1s1", "title": "Ứng dụng trong đời sống", "pedagogicalRole": "explain", "layoutHint": "bullets"},
                        {"id": "p1s2", "title": "Chốt kiến thức", "pedagogicalRole": "recap", "layoutHint": "bullets"}
                      ]
                    }
                  ]
                }
                """);
        when(aiClient.generate("expand")).thenReturn("""
                {
                  "slides": [
                    {
                      "id": "p1s1-1",
                      "sourceSlideId": "p1s1",
                      "title": "Nồng độ và nhiệt độ",
                      "content": "- Tăng nồng độ làm phản ứng xảy ra nhanh hơn.\\n- Giảm nhiệt độ giúp bảo quản thực phẩm lâu hơn.",
                      "durationMinutes": 2,
                      "requiredFacts": [],
                      "quizItems": [],
                      "visual": {"type": "none", "spec": ""},
                      "aiNote": ""
                    },
                    {
                      "id": "p1s1-2",
                      "sourceSlideId": "p1s1",
                      "title": "Diện tích bề mặt và xúc tác",
                      "content": "- Đập nhỏ chất rắn làm tăng diện tích tiếp xúc.\\n- Chất xúc tác làm phản ứng xảy ra nhanh hơn.",
                      "durationMinutes": 2,
                      "requiredFacts": [],
                      "quizItems": [],
                      "visual": {"type": "none", "spec": ""},
                      "aiNote": ""
                    },
                    {
                      "id": "outside-1",
                      "sourceSlideId": "outside",
                      "title": "Không thuộc part",
                      "content": "Phải bị bỏ qua"
                    },
                    {
                      "id": "p1s2",
                      "content": "- Các yếu tố có thể làm thay đổi tốc độ phản ứng.",
                      "durationMinutes": 1,
                      "requiredFacts": [],
                      "quizItems": [],
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
                        List.of("Thảo luận"),
                        List.of(new InlineActivityDto("a1", "Ứng dụng", 5, "Liên hệ thực tế", "", "", "")),
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

        var slides = captor.getValue();
        assertEquals(3, slides.size());
        assertEquals("p1s1-1", slides.get(0).id());
        assertEquals("Nồng độ và nhiệt độ", slides.get(0).title());
        assertEquals("explain", slides.get(0).pedagogicalRole());
        assertEquals("p1s1-2", slides.get(1).id());
        assertEquals("Diện tích bề mặt và xúc tác", slides.get(1).title());
        assertEquals("p1s2", slides.get(2).id());
        assertEquals("Chốt kiến thức", slides.get(2).title());
    }
}
