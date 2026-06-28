package com.edua.beeduasystem.presentation.dto.slides;

public record GenerateOutlineRequest(
        String lessonId,
        String lessonTitle,
        String lessonSummary,
        String grade,
        String subject,
        InlineLessonPlanDto plan,
        String userPrompt,
        String styleHint
) {
}
