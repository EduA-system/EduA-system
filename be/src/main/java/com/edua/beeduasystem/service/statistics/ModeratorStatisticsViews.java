package com.edua.beeduasystem.service.statistics;

import java.util.List;
import java.util.UUID;

public final class ModeratorStatisticsViews {
    private ModeratorStatisticsViews() { }

    public record TeacherOverdueCount(UUID teacherId, String teacherName, long overdueCount) { }

    public record OverdueByTeacher(List<TeacherOverdueCount> items) { }

    public record ReviewStatusCounts(long approved, long rejected) { }
}
