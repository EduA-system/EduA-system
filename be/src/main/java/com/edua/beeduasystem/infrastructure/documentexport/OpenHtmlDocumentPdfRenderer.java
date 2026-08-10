package com.edua.beeduasystem.infrastructure.documentexport;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Entities;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;

@Component
public class OpenHtmlDocumentPdfRenderer implements DocumentPdfRenderer {

    private static final List<FontCandidate> FONTS = List.of(
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/times.ttf"), 400, FontStyle.NORMAL),
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/timesbd.ttf"), 700, FontStyle.NORMAL),
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/timesi.ttf"), 400, FontStyle.ITALIC),
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/timesbi.ttf"), 700, FontStyle.ITALIC),
            new FontCandidate("Arial", Path.of("C:/Windows/Fonts/arial.ttf"), 400, FontStyle.NORMAL),
            new FontCandidate("Arial", Path.of("C:/Windows/Fonts/arialbd.ttf"), 700, FontStyle.NORMAL),
            new FontCandidate("DejaVu Serif", Path.of("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"), 400, FontStyle.NORMAL),
            new FontCandidate("DejaVu Serif", Path.of("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"), 700, FontStyle.NORMAL)
    );

    @Override
    public byte[] render(String html) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            String xhtml = toXhtml(html);
            PdfRendererBuilder builder = new PdfRendererBuilder()
                    .useFastMode()
                    .withHtmlContent(xhtml, null)
                    .toStream(out);
            FONTS.forEach(font -> registerFont(builder, font));
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Không thể tạo file PDF.", e);
        }
    }

    private static void registerFont(PdfRendererBuilder builder, FontCandidate font) {
        File file = font.path().toFile();
        if (file.isFile()) {
            builder.useFont(file, font.family(), font.weight(), font.style(), true);
        }
    }

    private static String toXhtml(String html) {
        Document document = Jsoup.parse(html);
        document.outputSettings()
                .syntax(Document.OutputSettings.Syntax.xml)
                .escapeMode(Entities.EscapeMode.xhtml)
                .charset(StandardCharsets.UTF_8)
                .prettyPrint(false);
        return document.html();
    }

    private record FontCandidate(String family, Path path, int weight, FontStyle style) {
    }
}
