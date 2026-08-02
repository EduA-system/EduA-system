package com.edua.beeduasystem.presentation.dto.classroom;

/** Shape giong response {@code POST /api/uploads} (api-chung.md), bo {@code fileId}. */
public record ClassResourceAttachmentRequest(
        String url,
        String fileName,
        String contentType,
        Long sizeBytes
) {
}
