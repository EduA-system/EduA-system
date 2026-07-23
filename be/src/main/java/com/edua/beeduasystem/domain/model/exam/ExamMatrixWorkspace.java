package com.edua.beeduasystem.domain.model.exam;

import java.util.List;
import java.util.Map;

/** Structured, transient source of truth shared by the matrix and specification tables. */
public record ExamMatrixWorkspace(
        int workspaceVersion,
        Metadata metadata,
        Configuration configuration,
        ExamScope scope,
        List<AssessmentItem> assessmentItems,
        List<Chapter> chapters,
        Summary summary
) {
    public record Metadata(String subject, String subjectLabel, int grade, String examType, String examTypeLabel) {
    }

    public record Configuration(
            String mode,
            String difficulty,
            boolean confirmedByTeacher,
            boolean allowEssayForGrade12,
            String complianceStatus,
            List<String> warnings,
            Map<String, QuestionType> questionTypes,
            Map<String, Integer> assessmentRatios
    ) {
    }

    public record QuestionType(
            String label,
            int questionCount,
            Integer itemsPerQuestion,
            Integer pointsPerQuestionCents,
            int scoreCents,
            List<List<Integer>> essayPartPointsCents
    ) {
    }

    public record AssessmentItem(
            String id,
            String questionType,
            String questionCode,
            String itemCode,
            int scoreCents,
            String level
    ) {
    }

    public record Chapter(
            String id,
            String sourceBookCode,
            String sourceChapterCode,
            String name,
            AllocationTrace allocationTrace,
            List<KnowledgeUnit> knowledgeUnits
    ) {
    }

    public record AllocationTrace(String weightSource, double rawWeight, double normalizedWeight, boolean fallbackUsed) {
    }

    public record KnowledgeUnit(
            String id,
            String sourceLessonCode,
            String name,
            String content,
            Map<String, List<String>> learningOutcomes,
            Map<String, Map<String, List<String>>> allocation
    ) {
    }

    public record Summary(
            int totalQuestionBlocks,
            int totalAssessmentItems,
            int totalScoreCents,
            Map<String, Totals> byType,
            Map<String, Totals> byLevel
    ) {
    }

    public record Totals(int count, int scoreCents, int ratioPercent) {
    }
}
