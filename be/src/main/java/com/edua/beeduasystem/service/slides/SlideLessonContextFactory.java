package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;

import java.util.List;

final class SlideLessonContextFactory {

    private SlideLessonContextFactory() {
    }

    static LessonContext fromOutlineRequest(GenerateOutlineRequest req) {
        InlineLessonPlanDto plan = req.plan();
        List<String> objectives = plan != null && plan.objectives() != null
                ? plan.objectives()
                : List.of();
        return new LessonContext(
                req.lessonId() != null && !req.lessonId().isBlank() ? req.lessonId() : "inline",
                req.lessonTitle() != null ? req.lessonTitle() : "Bài học",
                parseGrade(req.grade()),
                req.lessonSummary() != null ? req.lessonSummary() : "",
                objectives,
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );
    }

    static LessonContext fromPartsRequest(
            String lessonId,
            String lessonTitle,
            String lessonSummary,
            String grade) {
        return new LessonContext(
                lessonId != null && !lessonId.isBlank() ? lessonId : "inline",
                lessonTitle != null ? lessonTitle : "Bài học",
                parseGrade(grade),
                lessonSummary != null ? lessonSummary : "",
                List.of(),
                List.of(),
                List.of(),
                List.of(),
                List.of()
        );
    }

    private static int parseGrade(String grade) {
        if (grade == null || grade.isBlank()) return 10;
        String digits = grade.replaceAll("\\D+", "");
        if (digits.isEmpty()) return 10;
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return 10;
        }
    }
}
