package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class StatisticsReportHtmlBuilder {

    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    public String build(StatisticsReportViews.SchoolStatisticsReport report) {
        long totalContent = report.contentTrend().items().stream().mapToLong(StatisticsReportHtmlBuilder::totalContent).sum();
        long activeAccounts = report.accountsByRole().items().stream()
                .mapToLong(PrincipalStatisticsViews.AccountRoleStatus::active).sum();
        StringBuilder body = new StringBuilder();
        body.append(header("BÁO CÁO THỐNG KÊ TOÀN TRƯỜNG", report.generatedBy(),
                report.generatedAt().atZone(REPORT_ZONE).format(DATE_TIME)));
        body.append("<div class='filters'><b>Phạm vi:</b> Toàn trường | <b>Học liệu:</b> 6 tháng gần nhất | ")
                .append("<b>Weekly Task:</b> ").append(subjectLabel(report.weeklySubject())).append(" | ")
                .append("<b>Tài khoản:</b> ").append(subjectLabel(report.accountSubject())).append("</div>");
        body.append(metrics(List.of(
                new Metric("Học liệu được tạo (6 tháng)", totalContent),
                new Metric("Community Hub đã đăng", report.communityHubReview().approved()),
                new Metric("Tài khoản Active", activeAccounts))));

        body.append(sectionTitle("Học liệu được tạo theo thời gian"));
        body.append(contentTrendTable(report.contentTrend()));
        body.append(sectionTitle("Học liệu theo môn"));
        body.append(contentBySubjectTable(report.contentBySubject()));
        body.append(sectionTitle("Kiểm duyệt Community Hub"));
        body.append(reviewStatusTable(report.communityHubReview().pending(), report.communityHubReview().approved(),
                report.communityHubReview().rejected()));
        body.append(sectionTitle("Trạng thái Weekly Task"));
        body.append(weeklyTaskTable(report.weeklyTaskStatus()));
        body.append(sectionTitle("Tài khoản theo vai trò"));
        body.append(accountsTable(report.accountsByRole()));
        return document(body.toString());
    }

    public String build(StatisticsReportViews.SubjectStatisticsReport report) {
        long overdueThisQuarter = report.currentQuarterOverdue().items().stream()
                .mapToLong(ModeratorStatisticsViews.TeacherOverdueCount::overdueCount).sum();
        long reviewed = report.weeklyTaskReview().approved() + report.weeklyTaskReview().rejected();
        String approvalRate = reviewed == 0 ? "—" : Math.round(report.weeklyTaskReview().approved() * 100.0 / reviewed) + "%";
        StringBuilder body = new StringBuilder();
        body.append(header("BÁO CÁO THỐNG KÊ THEO MÔN", report.generatedBy(),
                report.generatedAt().atZone(REPORT_ZONE).format(DATE_TIME)));
        body.append("<div class='filters'><b>Môn:</b> ").append(subjectLabel(report.subject()))
                .append(" | <b>Kỳ phân tích task trễ hạn:</b> ").append(periodLabel(report)).append("</div>");
        body.append("<table class='metrics'><tr>")
                .append(metricCell("GV trễ hạn tuần này", String.valueOf(report.currentWeekOverdue().items().size())))
                .append(metricCell("Task trễ hạn quý này", String.valueOf(overdueThisQuarter)))
                .append(metricCell("Tỷ lệ duyệt Weekly Task", approvalRate)).append("</tr></table>");
        body.append(sectionTitle("Duyệt và từ chối Weekly Task"));
        body.append(reviewStatusTable(0, report.weeklyTaskReview().approved(), report.weeklyTaskReview().rejected()));
        body.append(sectionTitle("Duyệt và từ chối Community Hub"));
        body.append(reviewStatusTable(0, report.libraryContentReview().approved(), report.libraryContentReview().rejected()));
        body.append(sectionTitle("Task trễ hạn theo giáo viên — " + escape(periodLabel(report))));
        body.append(overdueTable(report.selectedPeriodOverdue()));
        return document(body.toString());
    }

    private static String document(String body) {
        return """
                <!doctype html><html lang="vi"><head><meta charset="utf-8"/><style>
                @page { size: A4; margin: 14mm; }
                * { box-sizing: border-box; }
                body { color:#222; font-family:"Arial","DejaVu Serif",sans-serif; font-size:10pt; line-height:1.4; }
                h1 { margin:0; text-align:center; font-size:17pt; color:#263238; }
                h2 { margin:18pt 0 6pt; padding-bottom:4pt; border-bottom:1px solid #cfc8bf; font-size:12pt; color:#2b2926; }
                .meta { margin:5pt 0 12pt; text-align:center; color:#666; }
                .filters { margin:8pt 0 12pt; padding:8pt; border:1px solid #d8d1c9; background:#f7f5f2; }
                table { width:100%; border-collapse:collapse; margin:6pt 0 12pt; }
                th, td { border:1px solid #c9c3bb; padding:5pt; vertical-align:middle; }
                th { background:#ede8e2; text-align:center; }
                td.number { text-align:right; }
                .metrics td { width:33.33%; padding:9pt; text-align:center; background:#fbfaf8; }
                .metric-label { color:#6b625a; font-size:8.5pt; }
                .metric-value { margin-top:3pt; font-size:18pt; font-weight:bold; color:#1f1f1f; }
                .bar-track { width:100%; height:8pt; background:#eee9e3; }
                .bar-approved { height:8pt; background:#5a7a4a; }
                .bar-pending { height:8pt; background:#d8a340; }
                .bar-rejected { height:8pt; background:#c2483c; }
                .bar-content { height:8pt; background:#d97757; }
                .empty { padding:16pt; border:1px solid #d8d1c9; text-align:center; color:#777; }
                </style></head><body>{{BODY}}</body></html>
                """.replace("{{BODY}}", body);
    }

    private static String header(String title, String generatedBy, String generatedAt) {
        return "<h1>" + escape(title) + "</h1><div class='meta'>Xuất bởi " + escape(generatedBy)
                + " lúc " + escape(generatedAt) + "</div>";
    }

    private static String metrics(List<Metric> metrics) {
        StringBuilder html = new StringBuilder("<table class='metrics'><tr>");
        metrics.forEach(metric -> html.append(metricCell(metric.label(), String.valueOf(metric.value()))));
        return html.append("</tr></table>").toString();
    }

    private static String metricCell(String label, String value) {
        return "<td><div class='metric-label'>" + escape(label) + "</div><div class='metric-value'>"
                + escape(value) + "</div></td>";
    }

    private static String contentTrendTable(PrincipalStatisticsViews.AiContentTrend data) {
        if (data.items().isEmpty()) return empty();
        long max = Math.max(1, data.items().stream().mapToLong(StatisticsReportHtmlBuilder::totalContent).max().orElse(1));
        StringBuilder html = new StringBuilder("<table><tr><th>Tháng</th><th>Giáo án</th><th>Slide</th><th>Bài tập</th><th>Mô phỏng</th><th>Biểu đồ tổng</th></tr>");
        data.items().forEach(item -> html.append("<tr><td>").append(escape(item.month())).append("</td>")
                .append(numberCells(item.lessonPlan(), item.slide(), item.test(), item.simulation()))
                .append(barCell(totalContent(item), max, "bar-content")).append("</tr>"));
        return html.append("</table>").toString();
    }

    private static String contentBySubjectTable(PrincipalStatisticsViews.ContentBySubject data) {
        if (data.items().isEmpty()) return empty();
        long max = Math.max(1, data.items().stream().mapToLong(StatisticsReportHtmlBuilder::totalContent).max().orElse(1));
        StringBuilder html = new StringBuilder("<table><tr><th>Môn</th><th>Giáo án</th><th>Slide</th><th>Bài tập</th><th>Mô phỏng</th><th>Biểu đồ tổng</th></tr>");
        data.items().forEach(item -> html.append("<tr><td>").append(subjectLabel(item.subject())).append("</td>")
                .append(numberCells(item.lessonPlan(), item.slide(), item.test(), item.simulation()))
                .append(barCell(totalContent(item), max, "bar-content")).append("</tr>"));
        return html.append("</table>").toString();
    }

    private static String weeklyTaskTable(PrincipalStatisticsViews.WeeklyTaskStatus data) {
        if (data.items().isEmpty()) return empty();
        StringBuilder html = new StringBuilder("<table><tr><th>Tuần</th><th>Chưa nộp</th><th>Đã nộp</th><th>Đã duyệt</th></tr>");
        data.items().forEach(item -> html.append("<tr><td>").append(escape(weekLabel(item.weekStartDate())))
                .append("</td>").append(numberCells(item.notSubmitted(), item.submitted(), item.approved())).append("</tr>"));
        return html.append("</table>").toString();
    }

    private static String accountsTable(PrincipalStatisticsViews.AccountsByRole data) {
        if (data.items().isEmpty()) return empty();
        StringBuilder html = new StringBuilder("<table><tr><th>Vai trò</th><th>Active</th><th>Inactive</th></tr>");
        data.items().forEach(item -> html.append("<tr><td>").append(roleLabel(item.role())).append("</td>")
                .append(numberCells(item.active(), item.inactive())).append("</tr>"));
        return html.append("</table>").toString();
    }

    private static String reviewStatusTable(long pending, long approved, long rejected) {
        long total = pending + approved + rejected;
        if (total == 0) return empty();
        StringBuilder html = new StringBuilder("<table><tr><th>Trạng thái</th><th>Số lượng</th><th>Tỷ lệ</th><th>Biểu đồ</th></tr>");
        if (pending > 0) appendReviewRow(html, "Chờ duyệt", pending, total, "bar-pending");
        appendReviewRow(html, "Đã duyệt/Đã đăng", approved, total, "bar-approved");
        appendReviewRow(html, "Từ chối", rejected, total, "bar-rejected");
        return html.append("</table>").toString();
    }

    private static void appendReviewRow(StringBuilder html, String label, long value, long total, String cssClass) {
        html.append("<tr><td>").append(escape(label)).append("</td><td class='number'>").append(value)
                .append("</td><td class='number'>").append(Math.round(value * 100.0 / total)).append("%</td>")
                .append(barCell(value, total, cssClass)).append("</tr>");
    }

    private static String overdueTable(ModeratorStatisticsViews.OverdueByTeacher data) {
        if (data.items().isEmpty()) return empty();
        long max = Math.max(1, data.items().stream().mapToLong(ModeratorStatisticsViews.TeacherOverdueCount::overdueCount).max().orElse(1));
        StringBuilder html = new StringBuilder("<table><tr><th>Giáo viên</th><th>Task trễ hạn</th><th>Biểu đồ</th></tr>");
        data.items().forEach(item -> html.append("<tr><td>").append(escape(item.teacherName() != null ? item.teacherName() : "—"))
                .append("</td><td class='number'>").append(item.overdueCount()).append("</td>")
                .append(barCell(item.overdueCount(), max, "bar-rejected")).append("</tr>"));
        return html.append("</table>").toString();
    }

    private static String numberCells(long... values) {
        StringBuilder html = new StringBuilder();
        for (long value : values) html.append("<td class='number'>").append(value).append("</td>");
        return html.toString();
    }

    private static String barCell(long value, long max, String cssClass) {
        long width = max == 0 ? 0 : Math.round(value * 100.0 / max);
        return "<td><div class='bar-track'><div class='" + cssClass + "' style='width:" + width + "%'></div></div></td>";
    }

    private static long totalContent(PrincipalStatisticsViews.AiContentTrendBucket item) {
        return item.lessonPlan() + item.slide() + item.test() + item.simulation();
    }

    private static long totalContent(PrincipalStatisticsViews.SubjectContentCount item) {
        return item.lessonPlan() + item.slide() + item.test() + item.simulation();
    }

    private static String periodLabel(StatisticsReportViews.SubjectStatisticsReport report) {
        if (report.periodMode() == StatisticsReportViews.PeriodMode.WEEK) {
            return "Tuần " + weekLabel(report.weekStartDate());
        }
        return "Quý " + report.quarter() + "/" + report.year();
    }

    private static String weekLabel(LocalDate monday) {
        return monday.format(DATE) + " - " + monday.plusDays(6).format(DATE);
    }

    private static String subjectLabel(Subject subject) {
        if (subject == null) return "Tất cả môn";
        return switch (subject) {
            case MATH -> "Toán";
            case PHYSICS -> "Vật lý";
            case CHEMISTRY -> "Hóa học";
        };
    }

    private static String roleLabel(Role role) {
        return switch (role) {
            case TEACHER -> "Teacher";
            case MODERATOR -> "Moderator";
            case PRINCIPAL -> "Principal";
            case IT_STAFF -> "IT Support";
            case STUDENT -> "Student";
        };
    }

    private static String sectionTitle(String title) {
        return "<h2>" + title + "</h2>";
    }

    private static String empty() {
        return "<div class='empty'>Chưa có dữ liệu.</div>";
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }

    private record Metric(String label, long value) { }
}
