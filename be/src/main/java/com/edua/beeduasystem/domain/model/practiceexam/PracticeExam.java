package com.edua.beeduasystem.domain.model.practiceexam;

import java.util.List;
import java.util.Map;

public record PracticeExam(String title, String instructions, int durationMinutes, int totalScoreCentiPoints,
                           List<Question> questions) {
    public record Question(int order, String type, String content, List<Option> options, Map<String, Object> answer,
                           String explanation, int scoreCentiPoints, List<Rubric> rubric, List<LessonRef> sourceLessonRefs) {}
    public record Option(String key, String content) {}
    public record Rubric(String criterion, int scoreCentiPoints) {}
    public record LessonRef(String bookCode, String chapterCode, String lessonCode) {}
}
