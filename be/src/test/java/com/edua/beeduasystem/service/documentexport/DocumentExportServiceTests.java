package com.edua.beeduasystem.service.documentexport;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DocumentExportServiceTests {

    @Test
    void exportPdf_normalizesBareAndNestedLatexInExistingDocuments() {
        CurrentUserProvider currentUser = mock(CurrentUserProvider.class);
        DocumentPdfRenderer renderer = mock(DocumentPdfRenderer.class);
        StorageClient storage = mock(StorageClient.class);
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        when(renderer.render(anyString())).thenReturn(new byte[] {1, 2, 3});
        when(storage.store(anyString(), any(), anyString())).thenReturn("https://cdn.example.test/export.pdf");
        DocumentExportService service = new DocumentExportService(currentUser, new BlogContentSanitizer(), renderer, storage);

        service.exportPdf("TEST", "Sai số", """
                <p>Sai số: frac{Delta s}{overline{s}} · 100%</p>
                <p><span data-type="inline-math" data-latex="\\frac{\\Delta A}{\\overline{A}}"></span></p>
                """, null, null);

        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(renderer).render(html.capture());
        assertThat(html.getValue())
                .contains("Δ")
                .contains("s̅")
                .doesNotContain("overline", "frac", "Delta");
    }
}
