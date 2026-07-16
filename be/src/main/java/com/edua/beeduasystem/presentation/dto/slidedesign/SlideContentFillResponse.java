package com.edua.beeduasystem.presentation.dto.slidedesign;

import java.util.List;

public record SlideContentFillResponse(
        List<SlideContentFillSlotResponse> slots,
        long latencyMs,
        String modelUsed,
        String warning
) {}
