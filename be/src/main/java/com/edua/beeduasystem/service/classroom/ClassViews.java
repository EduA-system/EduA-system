package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ClassViews {

    private ClassViews() {
    }

    public record ClassSummary(
            UUID id,
            String name,
            Subject subject,
            Integer grade,
            long memberCount,
            ClassStatus status,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record ClassDetail(
            UUID id,
            String name,
            String description,
            Subject subject,
            Integer grade,
            ClassStatus status,
            UUID ownerId,
            String ownerName,
            long memberCount,
            long resourceCount,
            long assignmentCount,
            long submissionCount,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long total
    ) {
    }
}
