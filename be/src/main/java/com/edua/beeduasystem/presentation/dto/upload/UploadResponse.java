package com.edua.beeduasystem.presentation.dto.upload;

/**
 * Metadata file đã upload; {@code fileId} dùng để feature khác tham chiếu
 * (vd lesson-plan truyền sang {@code /generate}).
 */
public record UploadResponse(
        String fileId,
        String url,
        String fileName,
        String contentType,
        long sizeBytes
) {
}
