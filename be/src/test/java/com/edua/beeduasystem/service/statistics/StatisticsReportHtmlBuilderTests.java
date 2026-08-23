package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StatisticsReportHtmlBuilderTests {

    private final StatisticsReportHtmlBuilder builder = new StatisticsReportHtmlBuilder();

    @Test
    void buildSchoolReport_containsCurrentFiltersTablesAndCharts() {
        var report = new StatisticsReportViews.SchoolStatisticsReport(
                Instant.parse("2026-08-23T10:00:00Z"), "principal@example.com", Subject.PHYSICS, Subject.CHEMISTRY,
                new PrincipalStatisticsViews.AiContentTrend(List.of(
                        new PrincipalStatisticsViews.AiContentTrendBucket("2026-08", LocalDate.of(2026, 8, 1), 3, 2, 1, 0))),
                new PrincipalStatisticsViews.ContentBySubject(List.of(
                        new PrincipalStatisticsViews.SubjectContentCount(Subject.PHYSICS, 3, 2, 1, 0))),
                new PrincipalStatisticsViews.WeeklyTaskStatus(List.of(
                        new PrincipalStatisticsViews.WeeklyTaskStatusBucket(LocalDate.of(2026, 8, 17), 1, 2, 3))),
                new PrincipalStatisticsViews.CommunityHubReview(2, 4, 1),
                new PrincipalStatisticsViews.AccountsByRole(List.of(
                        new PrincipalStatisticsViews.AccountRoleStatus(Role.TEACHER, 8, 2))));

        String html = builder.build(report);

        assertThat(html)
                .contains("BÁO CÁO THỐNG KÊ TOÀN TRƯỜNG", "Vật lý", "Hóa học", "principal@example.com")
                .contains("Học liệu được tạo theo thời gian", "Trạng thái Weekly Task", "Tài khoản theo vai trò")
                .contains("bar-content", "width:100%")
                .doesNotContain("Chưa có dữ liệu");
    }

    @Test
    void buildSubjectReport_escapesTeacherNameAndShowsEmptyReviewSections() {
        var overdue = new ModeratorStatisticsViews.OverdueByTeacher(List.of(
                new ModeratorStatisticsViews.TeacherOverdueCount(UUID.randomUUID(), "GV <An>", 2)));
        var report = new StatisticsReportViews.SubjectStatisticsReport(
                Instant.parse("2026-08-23T10:00:00Z"), "mod@example.com", Subject.MATH,
                StatisticsReportViews.PeriodMode.WEEK, LocalDate.of(2026, 8, 17), 2026, 3,
                overdue, overdue, overdue,
                new ModeratorStatisticsViews.ReviewStatusCounts(0, 0),
                new ModeratorStatisticsViews.ReviewStatusCounts(0, 0));

        String html = builder.build(report);

        assertThat(html)
                .contains("BÁO CÁO THỐNG KÊ THEO MÔN", "Toán", "GV &lt;An&gt;", "Task trễ hạn theo giáo viên")
                .contains("Chưa có dữ liệu.")
                .doesNotContain("GV <An>");
    }
}
