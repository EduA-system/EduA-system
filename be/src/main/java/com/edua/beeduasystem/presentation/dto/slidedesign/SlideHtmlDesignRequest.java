package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideHtmlDesignRequest(
        String topic,
        String outline,
        String styleHint,
        String subject,
        String step,
        String priorHtml
) {}
