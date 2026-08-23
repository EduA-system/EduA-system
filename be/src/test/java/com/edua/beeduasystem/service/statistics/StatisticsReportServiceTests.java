package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.documentexport.DocumentExportException;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StatisticsReportServiceTests {

    @Test
    void principalExport_requeriesAllDisplayedSectionsWithIndependentSubjectFilters() {
        PrincipalStatisticsService statistics = mock(PrincipalStatisticsService.class);
        StatisticsReportHtmlBuilder builder = mock(StatisticsReportHtmlBuilder.class);
        DocumentPdfRenderer renderer = mock(DocumentPdfRenderer.class);
        StorageClient storage = mock(StorageClient.class);
        CurrentUserProvider currentUser = mock(CurrentUserProvider.class);
        UUID userId = UUID.randomUUID();
        when(currentUser.require()).thenReturn(new AccessTokenClaims(userId, "principal@example.com", Set.of(Role.PRINCIPAL), null));
        when(statistics.aiContentTrend(6)).thenReturn(new PrincipalStatisticsViews.AiContentTrend(List.of()));
        when(statistics.contentBySubject()).thenReturn(new PrincipalStatisticsViews.ContentBySubject(List.of()));
        when(statistics.weeklyTaskStatus(null, null, Subject.PHYSICS)).thenReturn(new PrincipalStatisticsViews.WeeklyTaskStatus(List.of()));
        when(statistics.communityHubReview()).thenReturn(new PrincipalStatisticsViews.CommunityHubReview(0, 0, 0));
        when(statistics.accountsByRole(Subject.CHEMISTRY)).thenReturn(new PrincipalStatisticsViews.AccountsByRole(List.of()));
        when(builder.build(any(StatisticsReportViews.SchoolStatisticsReport.class))).thenReturn("<html></html>");
        when(renderer.render(anyString())).thenReturn(new byte[] {1, 2, 3});
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://cdn.example.test/report.pdf");
        var service = new PrincipalStatisticsReportService(statistics, builder, renderer, storage, currentUser);

        var result = service.exportPdf(Subject.PHYSICS, Subject.CHEMISTRY);

        assertThat(result.downloadUrl()).isEqualTo("https://cdn.example.test/report.pdf");
        assertThat(result.fileName()).isEqualTo("edua-bao-cao-thong-ke-toan-truong-6-thang.pdf");
        ArgumentCaptor<StatisticsReportViews.SchoolStatisticsReport> report = ArgumentCaptor.forClass(StatisticsReportViews.SchoolStatisticsReport.class);
        verify(builder).build(report.capture());
        assertThat(report.getValue().weeklySubject()).isEqualTo(Subject.PHYSICS);
        assertThat(report.getValue().accountSubject()).isEqualTo(Subject.CHEMISTRY);
        verify(storage).store(anyString(), any(), org.mockito.ArgumentMatchers.eq("application/pdf"));
    }

    @Test
    void moderatorExport_usesAssignedSubjectAndNormalizesSelectedWeek() {
        ModeratorStatisticsService statistics = mock(ModeratorStatisticsService.class);
        StatisticsReportHtmlBuilder builder = mock(StatisticsReportHtmlBuilder.class);
        DocumentPdfRenderer renderer = mock(DocumentPdfRenderer.class);
        StorageClient storage = mock(StorageClient.class);
        CurrentUserProvider currentUser = mock(CurrentUserProvider.class);
        UUID userId = UUID.randomUUID();
        when(currentUser.require()).thenReturn(new AccessTokenClaims(userId, "mod@example.com", Set.of(Role.MODERATOR), Subject.MATH));
        var empty = new ModeratorStatisticsViews.OverdueByTeacher(List.of());
        when(statistics.overdueByTeacherForWeek(any())).thenReturn(empty);
        when(statistics.overdueByTeacherForQuarter(any(Integer.class), any(Integer.class))).thenReturn(empty);
        when(statistics.weeklyTaskReviewSummary()).thenReturn(new ModeratorStatisticsViews.ReviewStatusCounts(0, 0));
        when(statistics.libraryContentReviewSummary()).thenReturn(new ModeratorStatisticsViews.ReviewStatusCounts(0, 0));
        when(builder.build(any(StatisticsReportViews.SubjectStatisticsReport.class))).thenReturn("<html></html>");
        when(renderer.render(anyString())).thenReturn(new byte[] {1});
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://cdn.example.test/mod.pdf");
        var service = new ModeratorStatisticsReportService(statistics, builder, renderer, storage, currentUser);

        service.exportPdf(StatisticsReportViews.PeriodMode.WEEK, LocalDate.of(2026, 8, 20), 2025, 2);

        ArgumentCaptor<StatisticsReportViews.SubjectStatisticsReport> report = ArgumentCaptor.forClass(StatisticsReportViews.SubjectStatisticsReport.class);
        verify(builder).build(report.capture());
        assertThat(report.getValue().subject()).isEqualTo(Subject.MATH);
        assertThat(report.getValue().weekStartDate()).isEqualTo(LocalDate.of(2026, 8, 20).with(DayOfWeek.MONDAY));
    }

    @Test
    void principalExport_wrapsRendererFailureAndDoesNotUpload() {
        PrincipalStatisticsService statistics = mock(PrincipalStatisticsService.class);
        StatisticsReportHtmlBuilder builder = mock(StatisticsReportHtmlBuilder.class);
        DocumentPdfRenderer renderer = mock(DocumentPdfRenderer.class);
        StorageClient storage = mock(StorageClient.class);
        CurrentUserProvider currentUser = mock(CurrentUserProvider.class);
        when(currentUser.require()).thenReturn(new AccessTokenClaims(UUID.randomUUID(), "principal@example.com", Set.of(Role.PRINCIPAL), null));
        when(statistics.aiContentTrend(6)).thenReturn(new PrincipalStatisticsViews.AiContentTrend(List.of()));
        when(statistics.contentBySubject()).thenReturn(new PrincipalStatisticsViews.ContentBySubject(List.of()));
        when(statistics.weeklyTaskStatus(null, null, null)).thenReturn(new PrincipalStatisticsViews.WeeklyTaskStatus(List.of()));
        when(statistics.communityHubReview()).thenReturn(new PrincipalStatisticsViews.CommunityHubReview(0, 0, 0));
        when(statistics.accountsByRole(null)).thenReturn(new PrincipalStatisticsViews.AccountsByRole(List.of()));
        when(builder.build(any(StatisticsReportViews.SchoolStatisticsReport.class))).thenReturn("<html></html>");
        when(renderer.render(anyString())).thenThrow(new IllegalStateException("renderer down"));
        var service = new PrincipalStatisticsReportService(statistics, builder, renderer, storage, currentUser);

        assertThatThrownBy(() -> service.exportPdf(null, null))
                .isInstanceOf(DocumentExportException.class)
                .hasMessage("Không thể tạo báo cáo thống kê PDF.");
    }
}
