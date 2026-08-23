package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.documentexport.DocumentExportException;
import com.edua.beeduasystem.service.documentexport.DocumentExportResult;
import java.time.LocalDate;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

final class StatisticsReportFileSupport {
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private StatisticsReportFileSupport() { }

    static DocumentExportResult export(String title, String html, UUID userId,
                                       DocumentPdfRenderer renderer, StorageClient storageClient) {
        byte[] pdf;
        try {
            pdf = renderer.render(html);
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tạo báo cáo thống kê PDF.", e);
        }
        String fileName = slug(title) + ".pdf";
        String key = "exports/pdf/%s/%s/%s-%s".formatted(userId, LocalDate.now(), UUID.randomUUID(), fileName);
        try {
            return new DocumentExportResult(fileName, storageClient.store(key, pdf, PDF_CONTENT_TYPE));
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tải báo cáo thống kê lên kho lưu trữ.", e);
        }
    }

    private static String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replace('đ', 'd')
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        return normalized.isBlank() ? "bao-cao-thong-ke" : normalized;
    }
}
