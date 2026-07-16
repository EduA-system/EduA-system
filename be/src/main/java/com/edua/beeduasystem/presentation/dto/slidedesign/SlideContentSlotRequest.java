package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideContentSlotRequest(
        String id,
        String kind,
        String zone,
        int maxChars,
        int maxLines,
        String hint
) {}
