package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GenerateSlideOutlineUseCaseTest {

    @Mock
    private AiClient aiClient;

    @Mock
    private SlidePromptBuilder promptBuilder;

    @InjectMocks
    private GenerateSlideOutlineUseCase useCase;

    @Test
    void parsesValidOutlineFromAi() {
        when(promptBuilder.outlineFromPlanPrompt(any(LessonContext.class), any(), any(), any()))
                .thenReturn("prompt");
        when(aiClient.generate(anyString())).thenReturn("""
                {
                  "lessonTitle": "Định luật II Newton",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Mở đầu",
                      "slides": [
                        {"id": "p1s1", "title": "Hook", "kind": "intro", "pedagogicalRole": "hook", "layoutHint": "title"}
                      ]
                    }
                  ]
                }
                """);

        var req = new GenerateOutlineRequest(
                "newton-2",
                "Định luật II Newton",
                "F = ma",
                "Lớp 10",
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
        assertEquals("Định luật II Newton", res.outline().lessonTitle());
        assertEquals(1, res.outline().parts().size());
        assertEquals("p1s1", res.outline().parts().get(0).slides().get(0).id());
    }
}
