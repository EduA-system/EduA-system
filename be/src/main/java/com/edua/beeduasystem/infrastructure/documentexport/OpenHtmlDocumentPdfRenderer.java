package com.edua.beeduasystem.infrastructure.documentexport;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.helper.W3CDom;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.file.Path;
import java.util.List;

@Component
public class OpenHtmlDocumentPdfRenderer implements DocumentPdfRenderer {

    private static final List<FontCandidate> FONTS = List.of(
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/times.ttf")),
            new FontCandidate("Times New Roman", Path.of("C:/Windows/Fonts/timesbd.ttf")),
            new FontCandidate("Arial", Path.of("C:/Windows/Fonts/arial.ttf")),
            new FontCandidate("DejaVu Serif", Path.of("/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf")),
            new FontCandidate("DejaVu Serif", Path.of("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"))
    );

    @Override
    public byte[] render(String html) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var document = new W3CDom().fromJsoup(Jsoup.parse(html));
            PdfRendererBuilder builder = new PdfRendererBuilder()
                    .useFastMode()
                    .withW3cDocument(document, null)
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
            builder.useFont(file, font.family());
        }
    }

    private record FontCandidate(String family, Path path) {
    }
}
