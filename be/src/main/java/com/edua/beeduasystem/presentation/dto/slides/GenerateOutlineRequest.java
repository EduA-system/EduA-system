package com.edua.beeduasystem.presentation.dto.slides;

public record GenerateOutlineRequest(
        String lessonId,
        String lessonTitle,
        String lessonSummary,
        String grade,
        InlineLessonPlanDto plan,
        String userPrompt,
        String styleHint
) {
}
