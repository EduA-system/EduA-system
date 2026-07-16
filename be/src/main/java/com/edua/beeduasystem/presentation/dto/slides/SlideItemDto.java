package com.edua.beeduasystem.presentation.dto.slides;

import com.edua.beeduasystem.domain.model.slide.ContentPlan;

/** HTTP/STOMP transport for semantic slide data. */
public record SlideItemDto(
        String id,
        String title,
        String pedagogicalRole,
        Integer durationMinutes,
        String aiNote,
        ContentPlan contentPlan) {
}
