package com.edua.beeduasystem.domain.model.classroom;

import java.util.UUID;

public record SubmissionFile(
        UUID id,
        UUID submissionId,
        String url,
        String fileName,
        String contentType,
        Long sizeBytes
) {
}
