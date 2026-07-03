package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SlideDesignPromptBuilderTest {

    @Test
    void step2PromptRequiresRatioPartitionZonesWithoutStructuralFill() {
        String priorHtml = """
                <div data-layer="bg" style="position:relative; width:960px; height:540px;">
                  <div data-region="header" data-body-top="92"></div>
                </div>
                """;
        var req = new SlideHtmlDesignRequest(
                "Định luật II Newton",
                "Nêu lực, khối lượng, gia tốc và ví dụ vận dụng.",
                "modern",
                "Vật lý",
                "structural",
                priorHtml);

        String prompt = new SlideDesignPromptBuilder().buildStep2StructZonesPrompt(req);

        assertTrue(prompt.contains("CUT this source rectangle into exactly 3 or 4 visible body"));
        assertTrue(prompt.contains("The BODY source rectangle to cut is x=0, y=92, width=960, height=448."));
        assertTrue(prompt.contains("Declare the ratio plan in the first zone's data-content-hint."));
        assertTrue(prompt.contains("Do NOT emit body structural children"));
        assertTrue(prompt.contains("Emit no"));
        assertTrue(prompt.contains("data-layer=\"struct\" elements."));
    }
}
