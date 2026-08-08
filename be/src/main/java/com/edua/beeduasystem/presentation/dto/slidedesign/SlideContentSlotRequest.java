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
        String hint,
        /** Slot's actual box size in px from the FE layout engine, null if not sent (older FE build). */
        Integer width,
        Integer height
) {}
