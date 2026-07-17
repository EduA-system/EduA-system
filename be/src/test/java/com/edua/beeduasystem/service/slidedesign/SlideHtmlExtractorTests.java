package com.edua.beeduasystem.service.slidedesign;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SlideHtmlExtractorTests {
    @Test
    void returnsEmptyForNullAndKeepsPlainFallbackText() {
        assertEquals("", SlideHtmlExtractor.extract(null));
        assertEquals("không có HTML", SlideHtmlExtractor.extract("  không có HTML  "));
    }

    @Test
    void removesThinkBlockAndExtractsFencedHtmlAnywhereInResponse() {
        String raw = "<think>reasoning</think> Mở đầu\n```html\n<div class=\"slide\">Nội dung</div>\n```\nKết thúc";

        assertEquals("<div class=\"slide\">Nội dung</div>", SlideHtmlExtractor.extract(raw));
    }

    @Test
    void extractsFromFirstHtmlOpeningAndRemovesTrailingFence() {
        String raw = "Preamble\n<!doctype html><html><body><div>Slide</div></body></html>\n```\nignored";

        String extracted = SlideHtmlExtractor.extract(raw);

        assertTrue(extracted.startsWith("<!doctype html>"));
        assertTrue(extracted.contains("<div>Slide</div>"));
        assertTrue(!extracted.contains("ignored"));
    }
}
