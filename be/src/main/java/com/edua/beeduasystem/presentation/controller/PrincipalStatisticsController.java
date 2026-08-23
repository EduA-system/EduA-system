package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.presentation.dto.statistics.StatisticsReportDto;
import com.edua.beeduasystem.service.statistics.PrincipalStatisticsReportService;
import com.edua.beeduasystem.service.statistics.PrincipalStatisticsService;
import com.edua.beeduasystem.service.statistics.PrincipalStatisticsViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/principal/statistics")
@PreAuthorize("hasRole('PRINCIPAL')")
@Tag(name = "Principal Statistics", description = "Thống kê toàn trường cho hiệu trưởng")
public class PrincipalStatisticsController {

    private final PrincipalStatisticsService service;
    private final PrincipalStatisticsReportService reportService;

    public PrincipalStatisticsController(PrincipalStatisticsService service, PrincipalStatisticsReportService reportService) {
        this.service = service;
        this.reportService = reportService;
    }

    @GetMapping("/ai-content-trend")
    @Operation(summary = "Nội dung sinh bằng AI theo thời gian")
    public PrincipalStatisticsViews.AiContentTrend aiContentTrend(@RequestParam(defaultValue = "6") int months) {
        return service.aiContentTrend(months);
    }

    @GetMapping("/content-by-subject")
    @Operation(summary = "Nội dung sinh theo môn")
    public PrincipalStatisticsViews.ContentBySubject contentBySubject() {
        return service.contentBySubject();
    }

    @GetMapping("/weekly-task-status")
    @Operation(summary = "Trạng thái duyệt Weekly Task theo tuần")
    public PrincipalStatisticsViews.WeeklyTaskStatus weeklyTaskStatus(@RequestParam(required = false) LocalDate from,
                                                                      @RequestParam(required = false) LocalDate to,
                                                                      @RequestParam(required = false) Subject subject) {
        return service.weeklyTaskStatus(from, to, subject);
    }

    @GetMapping("/community-hub-review")
    @Operation(summary = "Kiểm duyệt Community Hub")
    public PrincipalStatisticsViews.CommunityHubReview communityHubReview() {
        return service.communityHubReview();
    }

    @GetMapping("/accounts-by-role")
    @Operation(summary = "Quản lý tài khoản theo vai trò và trạng thái")
    public PrincipalStatisticsViews.AccountsByRole accountsByRole(@RequestParam(required = false) Subject subject) {
        return service.accountsByRole(subject);
    }

    @GetMapping("/report/pdf")
    @Operation(summary = "Xuất báo cáo thống kê toàn trường hiện tại thành PDF")
    public StatisticsReportDto exportReport(@RequestParam(required = false) Subject weeklySubject,
                                            @RequestParam(required = false) Subject accountSubject) {
        return StatisticsReportDto.from(reportService.exportPdf(weeklySubject, accountSubject));
    }
}
