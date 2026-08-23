package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.documentexport.DocumentExportResult;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

@Service
public class ModeratorStatisticsReportService {
    private final ModeratorStatisticsService statisticsService;
    private final StatisticsReportHtmlBuilder htmlBuilder;
    private final DocumentPdfRenderer pdfRenderer;
    private final StorageClient storageClient;
    private final CurrentUserProvider currentUser;

    public ModeratorStatisticsReportService(ModeratorStatisticsService statisticsService,
                                            StatisticsReportHtmlBuilder htmlBuilder,
                                            DocumentPdfRenderer pdfRenderer,
                                            StorageClient storageClient,
                                            CurrentUserProvider currentUser) {
        this.statisticsService = statisticsService;
        this.htmlBuilder = htmlBuilder;
        this.pdfRenderer = pdfRenderer;
        this.storageClient = storageClient;
        this.currentUser = currentUser;
    }

    public DocumentExportResult exportPdf(StatisticsReportViews.PeriodMode mode, LocalDate weekStartDate,
                                          Integer year, Integer quarter) {
        AccessTokenClaims claims = currentUser.require();
        Subject subject = claims.subject();
        if (subject == null) throw new ForbiddenOperationException("Tài khoản phải có subject để xuất thống kê.");

        LocalDate now = LocalDate.now();
        LocalDate monday = (weekStartDate != null ? weekStartDate : now).with(DayOfWeek.MONDAY);
        int resolvedYear = year != null ? year : now.getYear();
        int resolvedQuarter = quarter != null ? quarter : (now.getMonthValue() - 1) / 3 + 1;
        StatisticsReportViews.PeriodMode resolvedMode = mode != null ? mode : StatisticsReportViews.PeriodMode.WEEK;
        var selected = resolvedMode == StatisticsReportViews.PeriodMode.WEEK
                ? statisticsService.overdueByTeacherForWeek(monday)
                : statisticsService.overdueByTeacherForQuarter(resolvedYear, resolvedQuarter);
        var report = new StatisticsReportViews.SubjectStatisticsReport(
                Instant.now(), claims.email(), subject, resolvedMode, monday, resolvedYear, resolvedQuarter, selected,
                statisticsService.overdueByTeacherForWeek(now),
                statisticsService.overdueByTeacherForQuarter(now.getYear(), (now.getMonthValue() - 1) / 3 + 1),
                statisticsService.weeklyTaskReviewSummary(), statisticsService.libraryContentReviewSummary());
        String period = resolvedMode == StatisticsReportViews.PeriodMode.WEEK
                ? "tuần " + monday
                : "quý " + resolvedQuarter + " " + resolvedYear;
        String title = "EDUA Báo cáo thống kê " + subject.name() + " " + period;
        return StatisticsReportFileSupport.export(title, htmlBuilder.build(report), claims.userId(), pdfRenderer, storageClient);
    }
}
