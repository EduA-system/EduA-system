package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.documentexport.DocumentExportResult;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class PrincipalStatisticsReportService {
    private final PrincipalStatisticsService statisticsService;
    private final StatisticsReportHtmlBuilder htmlBuilder;
    private final DocumentPdfRenderer pdfRenderer;
    private final StorageClient storageClient;
    private final CurrentUserProvider currentUser;

    public PrincipalStatisticsReportService(PrincipalStatisticsService statisticsService,
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

    public DocumentExportResult exportPdf(Subject weeklySubject, Subject accountSubject) {
        AccessTokenClaims claims = currentUser.require();
        var report = new StatisticsReportViews.SchoolStatisticsReport(
                Instant.now(), claims.email(), weeklySubject, accountSubject,
                statisticsService.aiContentTrend(6), statisticsService.contentBySubject(),
                statisticsService.weeklyTaskStatus(null, null, weeklySubject), statisticsService.communityHubReview(),
                statisticsService.accountsByRole(accountSubject));
        String title = "EDUA Báo cáo thống kê toàn trường 6 tháng";
        return StatisticsReportFileSupport.export(title, htmlBuilder.build(report), claims.userId(), pdfRenderer, storageClient);
    }
}
