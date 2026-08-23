package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.Subject;
import java.time.Instant;
import java.time.LocalDate;

public final class StatisticsReportViews {
    private StatisticsReportViews() { }

    public enum PeriodMode {
        WEEK,
        QUARTER
    }

    public record SchoolStatisticsReport(
            Instant generatedAt,
            String generatedBy,
            Subject weeklySubject,
            Subject accountSubject,
            PrincipalStatisticsViews.AiContentTrend contentTrend,
            PrincipalStatisticsViews.ContentBySubject contentBySubject,
            PrincipalStatisticsViews.WeeklyTaskStatus weeklyTaskStatus,
            PrincipalStatisticsViews.CommunityHubReview communityHubReview,
            PrincipalStatisticsViews.AccountsByRole accountsByRole
    ) { }

    public record SubjectStatisticsReport(
            Instant generatedAt,
            String generatedBy,
            Subject subject,
            PeriodMode periodMode,
            LocalDate weekStartDate,
            Integer year,
            Integer quarter,
            ModeratorStatisticsViews.OverdueByTeacher selectedPeriodOverdue,
            ModeratorStatisticsViews.OverdueByTeacher currentWeekOverdue,
            ModeratorStatisticsViews.OverdueByTeacher currentQuarterOverdue,
            ModeratorStatisticsViews.ReviewStatusCounts weeklyTaskReview,
            ModeratorStatisticsViews.ReviewStatusCounts libraryContentReview
    ) { }
}
