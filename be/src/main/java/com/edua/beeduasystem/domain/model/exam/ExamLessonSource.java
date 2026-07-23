package com.edua.beeduasystem.domain.model.exam;

/** Read-only lesson data used while building a transient exam matrix. */
public record ExamLessonSource(
        String subjectCode,
        int grade,
        String bookCode,
        String bookName,
        Integer volume,
        int bookOrder,
        String chapterCode,
        String chapterName,
        int chapterOrder,
        String lessonCode,
        String lessonName,
        int lessonOrder,
        String knowledgeJson
) {
}
