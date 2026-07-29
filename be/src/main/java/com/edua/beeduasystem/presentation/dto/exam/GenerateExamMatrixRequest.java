package com.edua.beeduasystem.presentation.dto.exam;

import java.util.List;
import java.util.Map;

public record GenerateExamMatrixRequest(
        String subject,
        String subjectLabel,
        Integer grade,
        String examType,
        String examTypeLabel,
        String scopeToken,
        Boolean scopeConfirmed,
        Configuration configuration
) {
    public record Configuration(
            String mode,
            String difficulty,
            Boolean confirmedByTeacher,
            Boolean allowEssayForGrade12,
            Map<String, QuestionType> questionTypes,
            Map<String, Integer> assessmentRatios
    ) {
    }

    public record QuestionType(
            String label,
            Integer questionCount,
            Integer itemsPerQuestion,
            Integer pointsPerQuestionCents,
            Integer scoreCents,
            List<List<Integer>> essayPartPointsCents
    ) {
    }
}
