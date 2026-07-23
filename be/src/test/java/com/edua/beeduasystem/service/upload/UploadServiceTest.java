package com.edua.beeduasystem.service.upload;

import com.edua.beeduasystem.presentation.dto.upload.UploadResponse;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UploadServiceTest {
    private StorageClient storage;
    private UploadService service;

    @BeforeEach
    void setUp() {
        storage = mock(StorageClient.class);
        service = new UploadService(storage);
    }

    @Test
    void upload_validAllowedFileStoresItAndReturnsMetadata() {
        byte[] data = {1, 2, 3};
        when(storage.store(anyString(), same(data), eq("application/pdf"))).thenReturn("https://cdn.example/file.pdf");

        UploadResponse response = service.upload(data, "reference.PDF", "application/pdf");

        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(storage).store(key.capture(), same(data), eq("application/pdf"));
        assertThat(key.getValue()).matches("uploads/[0-9a-f-]+\\.pdf");
        assertThat(response).satisfies(value -> {
            assertThat(value.fileId()).isNotBlank();
            assertThat(value.url()).isEqualTo("https://cdn.example/file.pdf");
            assertThat(value.fileName()).isEqualTo("reference.PDF");
            assertThat(value.sizeBytes()).isEqualTo(3);
        });
    }

    @Test
    void upload_acceptsExactlyTenMegabytes() {
        byte[] data = new byte[10 * 1024 * 1024];
        when(storage.store(anyString(), same(data), isNull())).thenReturn("https://cdn.example/image.png");

        assertThat(service.upload(data, "image.png", null).sizeBytes()).isEqualTo(data.length);
        verify(storage).store(endsWith(".png"), same(data), isNull());
    }

    @Test
    void upload_rejectsNullOrEmptyDataWithoutCallingStorage() {
        assertThatThrownBy(() -> service.upload(null, "file.pdf", "application/pdf")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.upload(new byte[0], "file.pdf", "application/pdf")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void upload_rejectsDataLargerThanTenMegabytesWithoutCallingStorage() {
        assertThatThrownBy(() -> service.upload(new byte[10 * 1024 * 1024 + 1], "file.pdf", "application/pdf"))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void upload_rejectsMissingOrUnsupportedFileExtensionWithoutCallingStorage() {
        assertThatThrownBy(() -> service.upload(new byte[]{1}, null, "application/pdf")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.upload(new byte[]{1}, "no-extension", "application/pdf")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.upload(new byte[]{1}, "archive.zip", "application/zip")).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void upload_propagatesStorageFailureInsteadOfReturningFakeUrl() {
        when(storage.store(anyString(), any(), any())).thenThrow(new IllegalStateException("R2 unavailable"));

        assertThatThrownBy(() -> service.upload(new byte[]{1}, "file.jpg", "image/jpeg"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("R2 unavailable");
    }
}
