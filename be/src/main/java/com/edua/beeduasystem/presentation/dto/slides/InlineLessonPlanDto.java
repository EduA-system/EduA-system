package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record InlineLessonPlanDto(
        String lessonTitle,
        int gradeLevel,
        int totalDurationMinutes,
        List<String> objectives,
        List<String> teachingMethods,
        List<InlineActivityDto> activities,
        String consolidation,
        String homework
) {
}
