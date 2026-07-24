package com.edua.beeduasystem.domain.model.classroom;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.UUID;

public record Classroom(
        UUID id,
        UUID ownerId,
        String name,
        String description,
        Subject subject,
        Integer grade,
        ClassStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public boolean isActive() {
        return status == ClassStatus.ACTIVE;
    }

    public boolean isOwnedBy(UUID userId) {
        return ownerId != null && ownerId.equals(userId);
    }
}
