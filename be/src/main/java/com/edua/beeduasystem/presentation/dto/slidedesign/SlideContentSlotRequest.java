package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideContentSlotRequest(
        String id,
        String kind,
        String zone,
        String sourceBlockId,
        String sourcePartId,
        String sourceText,
        int maxChars,
        int maxLines,
        String hint
) {}
