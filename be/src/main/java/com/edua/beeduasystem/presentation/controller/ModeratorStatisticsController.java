package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.service.statistics.ModeratorStatisticsService;
import com.edua.beeduasystem.service.statistics.ModeratorStatisticsViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tab "Thống kê" trong Quản trị — chỉ Moderator, luôn scope theo subject của Moderator hiện tại
 * (không có bảng mapping Mod↔Teacher riêng, giống {@code WeeklyTaskController}/{@code LibraryContentController}).
 */
@RestController
@RequestMapping("/api/moderator/statistics")
@PreAuthorize("hasRole('MODERATOR')")
@Tag(name = "Moderator Statistics", description = "Thống kê task trễ hạn theo giáo viên + tỉ lệ Duyệt/Từ chối (Weekly Task, Community Hub)")
public class ModeratorStatisticsController {

    private final ModeratorStatisticsService service;

    public ModeratorStatisticsController(ModeratorStatisticsService service) {
        this.service = service;
    }

    @GetMapping("/overdue-by-teacher/week")
    @Operation(summary = "Bar chart — task trễ hạn theo giáo viên, filter theo tuần",
            description = "weekStartDate bất kỳ ngày nào trong tuần, server tự chuẩn hoá về Thứ Hai. Mặc định tuần hiện tại.")
    public ModeratorStatisticsViews.OverdueByTeacher overdueByTeacherWeek(@RequestParam(required = false) LocalDate weekStartDate) {
        return service.overdueByTeacherForWeek(weekStartDate != null ? weekStartDate : LocalDate.now());
    }

    @GetMapping("/overdue-by-teacher/quarter")
    @Operation(summary = "Bar chart — task trễ hạn theo giáo viên, filter theo quý (cộng dồn)")
    public ModeratorStatisticsViews.OverdueByTeacher overdueByTeacherQuarter(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer quarter) {
        LocalDate now = LocalDate.now();
        int resolvedYear = year != null ? year : now.getYear();
        int resolvedQuarter = quarter != null ? quarter : (now.getMonthValue() - 1) / 3 + 1;
        return service.overdueByTeacherForQuarter(resolvedYear, resolvedQuarter);
    }

    @GetMapping("/weekly-task-review-summary")
    @Operation(summary = "Donut — Duyệt vs Từ chối (Weekly Task), tổng từ trước đến nay")
    public ModeratorStatisticsViews.ReviewStatusCounts weeklyTaskReviewSummary() {
        return service.weeklyTaskReviewSummary();
    }

    @GetMapping("/library-content-review-summary")
    @Operation(summary = "Donut — Duyệt vs Từ chối (Community Hub), tổng từ trước đến nay")
    public ModeratorStatisticsViews.ReviewStatusCounts libraryContentReviewSummary() {
        return service.libraryContentReviewSummary();
    }
}
