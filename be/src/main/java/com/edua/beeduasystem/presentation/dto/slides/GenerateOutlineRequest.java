package com.edua.beeduasystem.presentation.dto.slides;

public record GenerateOutlineRequest(
        String lessonId,
        String lessonTitle,
        String lessonSummary,
        String grade,
        String subject,
        InlineLessonPlanDto plan,
        String userPrompt,
        String styleHint,
        String lessonContent,
        String libraryContentId
) {
    /** Compatibility constructor for clients still sending the inline lesson-plan payload. */
    public GenerateOutlineRequest(String lessonId, String lessonTitle, String lessonSummary, String grade,
                                  String subject, InlineLessonPlanDto plan, String userPrompt, String styleHint) {
        this(lessonId, lessonTitle, lessonSummary, grade, subject, plan, userPrompt, styleHint, null, null);
    }
}
