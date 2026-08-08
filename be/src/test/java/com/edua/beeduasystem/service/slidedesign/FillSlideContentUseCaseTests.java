package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentSlotRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.ImageGenerationClient;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FillSlideContentUseCaseTests {
    private AiClient aiClient;
    private ImageGenerationClient imageGenerationClient;
    private StorageClient storageClient;
    private ExecutorService imageExecutor;
    private FillSlideContentUseCase useCase;

    @BeforeEach
    void setUp() {
        aiClient = mock(AiClient.class);
        imageGenerationClient = mock(ImageGenerationClient.class);
        storageClient = mock(StorageClient.class);
        imageExecutor = Executors.newSingleThreadExecutor();
        useCase = new FillSlideContentUseCase(
                aiClient, new SlideDesignPromptBuilder(), new ObjectMapper(),
                imageGenerationClient, storageClient, imageExecutor, "gpt-test", "deepseek-test");
    }

    @AfterEach
    void tearDown() {
        imageExecutor.shutdown();
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
    void retriesOnceWhenAiReturnsMalformedJson() {
        when(aiClient.generate(anyString()))
                .thenReturn("{\"slots\":[")
                .thenReturn("{\"slots\":[{\"slotId\":\"hero-1\",\"text\":\"Nội dung\"}]}");

        var result = useCase.execute(request());

        assertEquals("Nội dung", result.slots().getFirst().text());
        verify(aiClient, times(2)).generate(anyString());
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
    void limitsTextToRequestedCharacterBudget() {
        String fullText = "Đây là dữ kiện bắt buộc phải được giữ nguyên dù dài hơn ngân sách gợi ý.";
        when(aiClient.generate(anyString())).thenReturn("{\"slots\":[{\"slotId\":\"hero-1\",\"text\":\"" + fullText + "\"}]}" );

        var result = useCase.execute(request());

        assertTrue(result.slots().getFirst().text().length() <= 90);
    }

    @Test
    void generatesRealImageAndUploadsToStorageForImageSlots() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung"},{"slotId":"aside-1","imagePrompt":"free body diagram of a cart"}]}
                """);
        byte[] fakePng = {1, 2, 3};
        when(imageGenerationClient.generatePng(eq("free body diagram of a cart"), anyString())).thenReturn(fakePng);
        when(storageClient.store(anyString(), any(byte[].class), anyString())).thenReturn("https://r2.example.com/slide-images/fake.png");

        var result = useCase.execute(request());

        var imageSlot = result.slots().get(1);
        assertEquals("free body diagram of a cart", imageSlot.imagePrompt());
        assertEquals("https://r2.example.com/slide-images/fake.png", imageSlot.imageUrl());
    }

    @Test
    void fallsBackToPromptOnlyWhenImageGenerationFails() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung"},{"slotId":"aside-1","imagePrompt":"free body diagram of a cart"}]}
                """);
        when(imageGenerationClient.generatePng(anyString(), anyString())).thenThrow(new RuntimeException("OpenAI image API down"));

        var result = useCase.execute(request());

        var imageSlot = result.slots().get(1);
        assertEquals("free body diagram of a cart", imageSlot.imagePrompt());
        assertNull(imageSlot.imageUrl());
    }

    @Test
    void picksLandscapeOpenAiSizeForWideImageSlot() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung"},{"slotId":"aside-1","imagePrompt":"free body diagram of a cart"}]}
                """);
        when(imageGenerationClient.generatePng(anyString(), anyString())).thenReturn(new byte[]{1});
        when(storageClient.store(anyString(), any(byte[].class), anyString())).thenReturn("https://r2.example.com/slide-images/fake.png");

        useCase.execute(requestWithImageSlotSize(640, 360));

        verify(imageGenerationClient).generatePng(anyString(), eq("1536x1024"));
    }

    @Test
    void picksPortraitOpenAiSizeForTallImageSlot() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung"},{"slotId":"aside-1","imagePrompt":"free body diagram of a cart"}]}
                """);
        when(imageGenerationClient.generatePng(anyString(), anyString())).thenReturn(new byte[]{1});
        when(storageClient.store(anyString(), any(byte[].class), anyString())).thenReturn("https://r2.example.com/slide-images/fake.png");

        useCase.execute(requestWithImageSlotSize(300, 520));

        verify(imageGenerationClient).generatePng(anyString(), eq("1024x1536"));
    }

    @Test
    void picksSquareOpenAiSizeWhenSlotSizeIsMissing() {
        when(aiClient.generate(anyString())).thenReturn("""
                {"slots":[{"slotId":"hero-1","text":"Nội dung"},{"slotId":"aside-1","imagePrompt":"free body diagram of a cart"}]}
                """);
        when(imageGenerationClient.generatePng(anyString(), anyString())).thenReturn(new byte[]{1});
        when(storageClient.store(anyString(), any(byte[].class), anyString())).thenReturn("https://r2.example.com/slide-images/fake.png");

        useCase.execute(request());

        verify(imageGenerationClient).generatePng(anyString(), eq("1024x1024"));
    }

    private static SlideContentFillRequest request() {
        return new SlideContentFillRequest(
                "Newton", "Nội dung nguồn", null, "Vật lý",
                List.of(
                        new SlideContentSlotRequest("hero-1", "text", "hero", "title", null, "Định luật II Newton", 90, 3, "slide title", null, null),
                        new SlideContentSlotRequest("aside-1", "image", "aside", "visual", null, "Sơ đồ lực", 70, 2, "illustration", null, null)
                ),
                List.of("#2b2926", "#d97757")
        );
    }

    private static SlideContentFillRequest requestWithImageSlotSize(int width, int height) {
        return new SlideContentFillRequest(
                "Newton", "Nội dung nguồn", null, "Vật lý",
                List.of(
                        new SlideContentSlotRequest("hero-1", "text", "hero", "title", null, "Định luật II Newton", 90, 3, "slide title", null, null),
                        new SlideContentSlotRequest("aside-1", "image", "aside", "visual", null, "Sơ đồ lực", 70, 2, "illustration", width, height)
                ),
                List.of("#2b2926", "#d97757")
        );
    }
}
