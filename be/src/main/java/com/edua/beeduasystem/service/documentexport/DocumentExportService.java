package com.edua.beeduasystem.service.documentexport;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

@Service
public class DocumentExportService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final CurrentUserProvider currentUserProvider;
    private final BlogContentSanitizer sanitizer;
    private final DocumentPdfRenderer pdfRenderer;
    private final StorageClient storageClient;

    public DocumentExportService(
            CurrentUserProvider currentUserProvider,
            BlogContentSanitizer sanitizer,
            DocumentPdfRenderer pdfRenderer,
            StorageClient storageClient
    ) {
        this.currentUserProvider = currentUserProvider;
        this.sanitizer = sanitizer;
        this.pdfRenderer = pdfRenderer;
        this.storageClient = storageClient;
    }

    public DocumentExportResult exportPdf(
            String rawType,
            String rawTitle,
            String rawDocumentHtml,
            Integer marginLeft,
            Integer marginRight
    ) {
        ExportType type = parseType(rawType);
        String title = requiredTitle(rawTitle);
        String sanitized = sanitizer.sanitize(rawDocumentHtml);
        if (sanitizer.isEmpty(sanitized)) {
            throw new IllegalArgumentException("Document content is required.");
        }

        String printableHtml = buildPrintableHtml(title, sanitized, cleanMargin(marginLeft), cleanMargin(marginRight));
        byte[] pdf;
        try {
            pdf = pdfRenderer.render(printableHtml);
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tạo nội dung PDF từ tài liệu hiện tại.", e);
        }

        String fileName = fileName(type, title);
        UUID userId = currentUserProvider.requireUserId();
        String key = "exports/pdf/%s/%s/%s-%s".formatted(
                userId,
                LocalDate.now(),
                UUID.randomUUID(),
                fileName
        );
        try {
            String downloadUrl = storageClient.store(key, pdf, PDF_CONTENT_TYPE);
            return new DocumentExportResult(fileName, downloadUrl);
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tải PDF lên kho lưu trữ.", e);
        }
    }

    private static String buildPrintableHtml(String title, String sanitizedHtml, int marginLeft, int marginRight) {
        Document fragment = Jsoup.parseBodyFragment(sanitizedHtml);
        normalizeMathNodes(fragment);
        String body = fragment.body().html();
        return """
                <!doctype html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8" />
                  <title>%s</title>
                  <style>
                    @page { size: A4; margin: 18mm; }
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      color: #111;
                      font-family: "Times New Roman", "DejaVu Serif", serif;
                      font-size: 12pt;
                      line-height: 1.45;
                    }
                    .document-page {
                      padding-left: %dpx;
                      padding-right: %dpx;
                    }
                    h1 { font-size: 16pt; text-align: center; margin: 0 0 6pt; }
                    h2 { font-size: 14pt; margin: 18pt 0 8pt; }
                    h3 { font-size: 12pt; margin: 14pt 0 6pt; }
                    p { margin: 0 0 6pt; }
                    ul, ol { margin: 0 0 8pt; padding-left: 20pt; }
                    li { margin-bottom: 3pt; }
                    table { width: 100%%; border-collapse: collapse; margin: 8pt 0; page-break-inside: avoid; }
                    th, td { border: 1px solid #333; padding: 6pt; vertical-align: top; }
                    th { text-align: center; font-weight: 700; }
                    img { max-width: 100%%; height: auto; }
                    .document-meta { text-align: center; color: #444; margin-bottom: 16pt; }
                    .mc-option { margin: 2pt 0; }
                    .math-inline { font-family: "Times New Roman", "DejaVu Serif", serif; }
                    .math-block { margin: 8pt 0; text-align: center; font-family: "Times New Roman", "DejaVu Serif", serif; }
                  </style>
                </head>
                <body><div class="document-page">%s</div></body>
                </html>
                """.formatted(escapeXml(title), marginLeft, marginRight, body);
    }

    private static void normalizeMathNodes(Document document) {
        for (Element element : document.select("[data-latex]")) {
            String latex = element.attr("data-latex");
            if ("block-math".equals(element.attr("data-type"))) {
                Element replacement = new Element("div").addClass("math-block");
                replacement.text(latex);
                element.replaceWith(replacement);
            } else {
                Element replacement = new Element("span").addClass("math-inline");
                replacement.text(latex);
                element.replaceWith(replacement);
            }
        }
    }

    private static ExportType parseType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            throw new IllegalArgumentException("Type is required.");
        }
        try {
            ExportType type = ExportType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
            if (type == ExportType.LESSON_PLAN || type == ExportType.TEST) {
                return type;
            }
        } catch (IllegalArgumentException ignored) {
        }
        throw new IllegalArgumentException("Invalid export type.");
    }

    private static String requiredTitle(String rawTitle) {
        if (rawTitle == null || rawTitle.isBlank()) {
            throw new IllegalArgumentException("Title is required.");
        }
        String title = rawTitle.trim();
        if (title.length() > 160) {
            return title.substring(0, 160).trim();
        }
        return title;
    }

    private static int cleanMargin(Integer value) {
        if (value == null) {
            return 80;
        }
        return Math.max(24, Math.min(value, 160));
    }

    private static String fileName(ExportType type, String title) {
        String prefix = type == ExportType.LESSON_PLAN ? "giao-an" : "de-kiem-tra";
        return prefix + "-" + slug(title) + ".pdf";
    }

    private static String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized.isBlank() ? "tai-lieu" : normalized;
    }

    private static String escapeXml(String value) {
        return Parser.unescapeEntities(value, false)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private enum ExportType {
        LESSON_PLAN,
        TEST
    }
}
