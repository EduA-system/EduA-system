package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideContentFillSlotResponse(
        String slotId,
        String text,
        String imagePrompt,
        SlideContentStyleResponse style
) {}
