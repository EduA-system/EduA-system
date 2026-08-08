package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideContentFillSlotResponse(
        String slotId,
        String text,
        String imagePrompt,
        SlideContentStyleResponse style,
        /** URL ảnh thật đã sinh (OpenAI Images) + upload R2, null nếu chưa/không sinh được. */
        String imageUrl
) {}
