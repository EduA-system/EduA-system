package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import java.time.LocalDate;
import java.util.List;

public final class PrincipalStatisticsViews {
    private PrincipalStatisticsViews() { }

    public record ContentTypeCounts(long lessonPlan, long slide, long test, long simulation) { }

    public record AiContentTrendBucket(String month, LocalDate monthStartDate, long lessonPlan, long slide, long test, long simulation) { }

    public record AiContentTrend(List<AiContentTrendBucket> items) { }

    public record SubjectContentCount(Subject subject, long lessonPlan, long slide, long test, long simulation) { }

    public record ContentBySubject(List<SubjectContentCount> items) { }

    public record WeeklyTaskStatusBucket(LocalDate weekStartDate, long notSubmitted, long submitted, long approved) { }

    public record WeeklyTaskStatus(List<WeeklyTaskStatusBucket> items) { }

    public record CommunityHubReview(long pending, long approved, long rejected) { }

    public record AccountRoleStatus(Role role, long active, long inactive) { }

    public record AccountsByRole(List<AccountRoleStatus> items) { }
}
