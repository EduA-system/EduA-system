package com.edua.beeduasystem.domain.model.exam;

import java.util.List;

public record ExamScope(
        String resolution,
        int scopeVersion,
        int semester,
        String subject,
        int grade,
        String examType,
        String token,
        boolean confirmationRequired,
        List<LessonRef> lessons
) {
    public record LessonRef(
            String bookCode,
            String bookName,
            String chapterCode,
            String chapterName,
            String lessonCode,
            String lessonName
    ) {
    }
}
