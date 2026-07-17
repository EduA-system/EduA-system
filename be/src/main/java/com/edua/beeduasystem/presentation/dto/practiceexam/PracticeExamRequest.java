package com.edua.beeduasystem.presentation.dto.practiceexam;

import java.util.List;

public record PracticeExamRequest(
        String title, String subject, Integer grade, Integer durationMinutes, String difficulty,
        Integer totalQuestionCount, Integer totalScoreCentiPoints, Boolean teacherConfirmedWarning,
        List<QuestionType> questionTypes, KnowledgeScope knowledgeScope
) {
    public record QuestionType(String type, Integer questionCount, Integer totalScoreCentiPoints, Integer itemsPerQuestion) {}
    public record KnowledgeScope(String bookCode, List<LessonRef> lessonRefs) {}
    public record LessonRef(String chapterCode, String lessonCode) {}
}
