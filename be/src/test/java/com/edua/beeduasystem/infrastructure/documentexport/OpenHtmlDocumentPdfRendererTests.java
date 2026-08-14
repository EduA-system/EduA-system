package com.edua.beeduasystem.infrastructure.documentexport;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenHtmlDocumentPdfRendererTests {

    @Test
    void render_embedsVietnameseGlyphsInsteadOfReplacingThem() throws Exception {
        byte[] pdf = new OpenHtmlDocumentPdfRenderer().render("""
                <!doctype html><html><head><meta charset="utf-8"/>
                <style>body { font-family: Arial, serif; }</style></head>
                <body>Kiểm tra tiếng Việt: Đặng, Nguyễn, ă â ê ô ơ ư.</body></html>
                """);

        try (PDDocument document = Loader.loadPDF(pdf)) {
            String text = new PDFTextStripper().getText(document);
            assertThat(text).contains("Kiểm tra tiếng Việt: Đặng, Nguyễn, ă â ê ô ơ ư.");
        }
    }
}
