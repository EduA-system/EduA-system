package com.edua.beeduasystem.domain.model.classroom;

import java.time.Instant;
import java.util.UUID;

public record Submission(
        UUID id,
        UUID classResourceId,
        UUID studentId,
        String textContent,
        SubmissionStatus status,
        Instant submittedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
