package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SlideDesignPromptBuilderTests {
    @Test
    void asksAiToChooseALightContentSurfaceColor() {
        var request = new SlideHtmlDesignRequest("Newton", "", null, "Vật lý", "bg_deco", null);

        String prompt = new SlideDesignPromptBuilder().buildStep1BgDecoPrompt(request);

        assertTrue(prompt.contains("data-surface-color=\"#RRGGBB\""));
        assertTrue(prompt.contains("rendered at 60%"));
        assertTrue(prompt.contains("light surface color"));
    }
}
