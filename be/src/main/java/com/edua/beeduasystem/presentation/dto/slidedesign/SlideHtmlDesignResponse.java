package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideHtmlDesignResponse(
        String html,
        long latencyMs,
        String modelUsed,
        String warning
) {}
