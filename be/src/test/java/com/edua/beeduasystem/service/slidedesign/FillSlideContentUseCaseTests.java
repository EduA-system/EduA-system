package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentSlotRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FillSlideContentUseCaseTests {
    private AiClient aiClient;
    private FillSlideContentUseCase useCase;

    @BeforeEach
    void setUp() {
        aiClient = mock(AiClient.class);
        useCase = new FillSlideContentUseCase(
                aiClient, new SlideDesignPromptBuilder(), new ObjectMapper(), "gpt-test", "deepseek-test");
    }

    @Test
    void fillsOnlyRequestedSlotsAndClampsStyle() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[
                  {"slotId":"hero-1","text":"Định luật II Newton","style":{"fontSize":200,"color":"#D97757","bold":true,"italic":false,"align":"center"}},
                  {"slotId":"aside-1","imagePrompt":"free body diagram of a cart"},
                  {"slotId":"unknown","text":"ignored"}
                ]}
                """);

        var result = useCase.execute(request());

        assertEquals(2, result.slots().size());
        assertEquals("Định luật II Newton", result.slots().getFirst().text());
        assertEquals(64, result.slots().getFirst().style().fontSize());
        assertEquals("#d97757", result.slots().getFirst().style().color());
        assertEquals("free body diagram of a cart", result.slots().get(1).imagePrompt());
    }

    @Test
    void rejectsMalformedAiJson() {
        when(aiClient.generate(anyString())).thenReturn("not-json");
        assertThrows(IllegalStateException.class, () -> useCase.execute(request()));
    }

    @Test
    void rejectsColorsOutsideTheProvidedPalette() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung","style":{"color":"#ff0000"}},{"slotId":"aside-1","imagePrompt":null}]}
                """);

        var result = useCase.execute(request());

        assertNull(result.slots().getFirst().style().color());
    }

    @Test
    void keepsTextLongerThanTheSuggestedBudget() {
        String fullText = "Đây là dữ kiện bắt buộc phải được giữ nguyên dù dài hơn ngân sách gợi ý.";
        when(aiClient.generate(anyString())).thenReturn("{\"slots\":[{\"slotId\":\"hero-1\",\"text\":\"" + fullText + "\"}]}" );

        var result = useCase.execute(request());

        assertEquals(fullText, result.slots().getFirst().text());
    }

    @Test
    void rejectsRequestsWithoutUsableContentSlotsBeforeCallingAi() {
        SlideContentFillRequest empty = new SlideContentFillRequest("Newton", "Nội dung", null, "Vật lý",
                List.of(new SlideContentSlotRequest(" ", "text", "hero", null, null, "", 10, 1, "")), List.of());

        assertThrows(IllegalArgumentException.class, () -> useCase.execute(empty));
    }

    @Test
    void acceptsFencedJsonAndSanitizesImagePromptAndStyle() {
        String longPrompt = "x".repeat(650);
        when(aiClient.generate(anyString())).thenReturn("```json\n{\"slots\":["
                + "{\"slotId\":\"hero-1\",\"text\":\"  Tiêu đề  \",\"style\":{\"fontSize\":1,\"color\":\"#2B2926\",\"align\":\"justify\"}},"
                + "{\"slotId\":\"aside-1\",\"imagePrompt\":\"" + longPrompt + "\"}]}\n```");

        var result = useCase.execute(request());

        assertEquals("Tiêu đề", result.slots().getFirst().text());
        assertEquals(28, result.slots().getFirst().style().fontSize());
        assertEquals("#2b2926", result.slots().getFirst().style().color());
        assertNull(result.slots().getFirst().style().align());
        assertEquals(600, result.slots().get(1).imagePrompt().length());
    }

    private static SlideContentFillRequest request() {
        return new SlideContentFillRequest(
                "Newton", "Nội dung nguồn", null, "Vật lý",
                List.of(
                        new SlideContentSlotRequest("hero-1", "text", "hero", "title", null, "Định luật II Newton", 90, 3, "slide title"),
                        new SlideContentSlotRequest("aside-1", "image", "aside", "visual", null, "Sơ đồ lực", 70, 2, "illustration")
                ),
                List.of("#2b2926", "#d97757")
        );
    }
}
