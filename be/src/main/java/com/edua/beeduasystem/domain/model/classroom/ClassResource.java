package com.edua.beeduasystem.domain.model.classroom;

import java.time.Instant;
import java.util.UUID;

public record ClassResource(
        UUID id,
        UUID classId,
        UUID postedBy,
        String title,
        String description,
        ResourceSourceType sourceType,
        UUID sourceLibraryContentId,
        String thumbnailUrl,
        String attachmentFileId,
        String attachmentUrl,
        String attachmentFileName,
        String attachmentContentType,
        Long attachmentSizeBytes,
        boolean submissionEnabled,
        Instant deadline,
        Instant createdAt,
        Instant updatedAt
) {
    public boolean hasAttachment() {
        return attachmentUrl != null;
    }
}
