package com.edua.beeduasystem.service.slides;

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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

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

    private static String blueprint() {
        return "{\"chapters\":["
                + "{\"id\":\"p1\",\"title\":\"Mở đầu vấn đề\",\"learningGoal\":\"Gợi vấn đề\",\"slideBudget\":3,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p2\",\"title\":\"Khám phá hiện tượng\",\"learningGoal\":\"Quan sát\",\"slideBudget\":6,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p3\",\"title\":\"Hình thành kiến thức\",\"learningGoal\":\"Giải thích\",\"slideBudget\":7,\"sourceChunkIds\":[\"c1\"]},"
                + "{\"id\":\"p4\",\"title\":\"Luyện tập và củng cố\",\"learningGoal\":\"Vận dụng\",\"slideBudget\":5,\"sourceChunkIds\":[\"c1\"]}]}";
    }
}
