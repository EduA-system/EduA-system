package com.edua.beeduasystem.presentation.dto.slidedesign;

import java.util.List;

public record SlideContentFillRequest(
        String topic,
        String outline,
        String styleHint,
        String subject,
        List<SlideContentSlotRequest> slots,
        List<String> palette
) {}
