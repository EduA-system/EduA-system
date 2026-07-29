package com.edua.beeduasystem.service.weeklytask;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class WeeklyTaskViews {
    private WeeklyTaskViews() { }

    public record Summary(UUID id, UUID teacherId, String teacherName, Subject subject, LocalDate weekStartDate,
                           String scopeDescription, Instant deadline, WeeklyTaskReviewStatus reviewStatus,
                           Instant submittedAt) { }

    public record Detail(UUID id, UUID moderatorId, String moderatorName, Subject subject, UUID teacherId,
                          String teacherName, LocalDate weekStartDate, String scopeDescription, Instant deadline,
                          WeeklyTaskReviewStatus reviewStatus, UUID sourceLibraryContentId, String sourceDocumentUrl,
                          String sourceDocumentName, Instant submittedAt, UUID reviewedBy, String reviewedByName,
                          Instant reviewedAt, String rejectionReason, Instant createdAt, Instant updatedAt) { }

    public record Week(LocalDate weekStartDate, List<Summary> tasks) { }

    public record Schedule(List<Week> weeks) { }

    public record Page(List<Summary> items, int page, int size, long total) { }

    public record BulkResult(List<Summary> created, int teacherCount, int lessonCount) { }

    static Summary toSummary(WeeklyTask t, Map<UUID, String> userNames) {
        return new Summary(t.id(), t.teacherId(), userNames.get(t.teacherId()), t.subject(), t.weekStartDate(),
                t.scopeDescription(), t.deadline(), t.reviewStatus(), t.submittedAt());
    }

    static Detail toDetail(WeeklyTask t, Map<UUID, String> userNames) {
        return new Detail(t.id(), t.moderatorId(), userNames.get(t.moderatorId()), t.subject(), t.teacherId(),
                userNames.get(t.teacherId()), t.weekStartDate(), t.scopeDescription(), t.deadline(), t.reviewStatus(),
                t.sourceLibraryContentId(), t.sourceDocumentUrl(), t.sourceDocumentName(), t.submittedAt(),
                t.reviewedBy(), t.reviewedBy() != null ? userNames.get(t.reviewedBy()) : null, t.reviewedAt(),
                t.rejectionReason(), t.createdAt(), t.updatedAt());
    }

    static Schedule toSchedule(List<WeeklyTask> tasks, Map<UUID, String> userNames) {
        Map<LocalDate, List<Summary>> byWeek = tasks.stream()
                .map(t -> toSummary(t, userNames))
                .collect(java.util.stream.Collectors.groupingBy(Summary::weekStartDate, java.util.LinkedHashMap::new, java.util.stream.Collectors.toList()));
        List<Week> weeks = byWeek.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new Week(e.getKey(), e.getValue()))
                .toList();
        return new Schedule(weeks);
    }

    static BulkResult toBulkResult(List<WeeklyTask> tasks, Map<UUID, String> userNames, int teacherCount, int lessonCount) {
        return new BulkResult(tasks.stream().map(t -> toSummary(t, userNames)).toList(), teacherCount, lessonCount);
    }
}
