package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GenerateSlideHtmlDesignUseCaseTests {
    private AiClient aiClient;
    private GenerateSlideHtmlDesignUseCase useCase;

    @BeforeEach
    void setUp() {
        aiClient = mock(AiClient.class);
        useCase = new GenerateSlideHtmlDesignUseCase(aiClient, new SlideDesignPromptBuilder(), "gpt-test", "deepseek-test");
    }

    @Test
    void generatesBgDecoAndExtractsHtmlFromAiPreamble() {
        when(aiClient.generate(anyString())).thenReturn("Đây là kết quả:\n```html\n"
                + "<div data-layer=\"bg\" data-region=\"header\" data-body-top=\"80\"></div>\n```");

        var result = useCase.execute(request("bg_deco", null));

        assertTrue(result.html().startsWith("<div"));
        assertTrue(result.warning().contains("preamble/fence"));
    }

    @Test
    void returnsControlledWarningsForUnknownStepAndMissingPriorHtml() {
        var unknown = useCase.execute(request("unknown", null));
        var structural = useCase.execute(request("structural", " "));
        var content = useCase.execute(request("content_fill", null));

        assertTrue(unknown.warning().contains("Unknown step"));
        assertTrue(structural.warning().contains("needs priorHtml"));
        assertTrue(content.warning().contains("needs priorHtml"));
        verify(aiClient, never()).generate(anyString());
    }

    @Test
    void stripsStructuralDebugLegendsButKeepsContentAndOverlay() {
        String prior = "<div data-layer=\"bg\" data-region=\"header\"></div>"
                + "<div data-layer=\"deco\" style=\"color:red\"></div>"
                + "<div data-layer=\"zone\" data-zone=\"hero\" style=\"outline: 2px dashed\"></div>";
        when(aiClient.generate(anyString())).thenReturn("""
                <div data-layer="content" data-region="header"><span>zone: hero</span><span>520×160 · max 120 chars · 4 lines</span><p>Newton</p></div>
                <div data-layer="zone" data-zone="hero" style="outline: 2px dashed"><span>struct: body</span><p>Lực</p></div>
                """);

        var result = useCase.execute(request("content_fill", prior));

        assertTrue(result.html().contains("Newton"));
        assertTrue(result.html().contains("Lực"));
        assertTrue(result.html().contains("outline: 2px dashed"));
        assertFalse(result.html().contains("zone: hero"));
        assertFalse(result.html().contains("struct: body"));
    }

    @Test
    void reportsMissingStepOneContractMarkers() {
        when(aiClient.generate(anyString())).thenReturn("<div data-layer=\"bg\"></div>");

        var result = useCase.execute(request("bg_deco", null));

        assertTrue(result.warning().contains("thiếu header"));
    }

    private static SlideHtmlDesignRequest request(String step, String priorHtml) {
        return new SlideHtmlDesignRequest("Newton", "Outline", null, "Vật lý", step, priorHtml);
    }
}
