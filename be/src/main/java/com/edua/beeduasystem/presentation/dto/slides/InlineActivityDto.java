package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record InlineActivityDto(
        String id,
        String name,
        int durationMinutes,
        String goal,
        String teacherActions,
        String studentActions,
        String evaluation
) {
}
