package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SlideDesignPromptBuilderTest {

    private final SlideDesignPromptBuilder builder = new SlideDesignPromptBuilder();

    @Test
    void structuralPromptIncludesPedagogicalLayoutCatalog() {
        String prompt = builder.buildStep2StructZonesPrompt(new SlideHtmlDesignRequest(
                "Tốc độ phản ứng",
                "Ứng dụng trong đời sống (Giải thích)\n\nNội dung hiển thị:\n- Tăng nồng độ\n- Tăng nhiệt độ",
                "Tối giản",
                "Hóa học",
                "structural",
                """
                        <div data-layer="bg" style="position:relative; width:960px; height:540px;" data-body-top="80">
                          <div data-region="header" data-body-top="80"></div>
                        </div>
                        """
        ));

        assertTrue(prompt.contains("<pedagogical_layout_catalog required=\"true\">"));
        assertTrue(prompt.contains("comparison / factors / applications"));
        assertTrue(prompt.contains("experiment / demonstrate"));
        assertTrue(prompt.contains("practice / quiz / worked-example"));
        assertTrue(prompt.contains("Mini-card backplates"));
    }

    @Test
    void contentFillPromptIncludesDecorationPatternsAndTextGuards() {
        String prompt = builder.buildStep3ContentFillPrompt(new SlideHtmlDesignRequest(
                "Tốc độ phản ứng",
                "Ứng dụng trong đời sống (Giải thích)\n\nNội dung hiển thị:\n- Tăng nồng độ\n- Tăng nhiệt độ",
                "Tối giản",
                "Hóa học",
                "content_fill",
                """
                        <div data-layer="bg" style="position:relative; width:960px; height:540px;">
                          <div data-region="header"></div>
                          <div data-layer="zone" data-region="body" data-zone="hero"></div>
                        </div>
                        """
        ));

        assertTrue(prompt.contains("CONTENT DECORATION PATTERNS"));
        assertTrue(prompt.contains("Chips:"));
        assertTrue(prompt.contains("Mini-cards:"));
        assertTrue(prompt.contains("AVOID PLAIN BULLET WALLS"));
        assertTrue(prompt.contains("word-break:normal"));
        assertTrue(prompt.contains("đế n"));
        assertTrue(prompt.contains("Cần tách slide ở bước outline"));
    }
}
