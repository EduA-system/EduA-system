package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.service.classroom.ClassViews;

import java.time.Instant;
import java.util.UUID;

public record ClassDetailDto(
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
    public static ClassDetailDto from(ClassViews.ClassDetail view) {
        return new ClassDetailDto(
                view.id(),
                view.name(),
                view.description(),
                view.subject(),
                view.grade(),
                view.status(),
                view.ownerId(),
                view.ownerName(),
                view.memberCount(),
                view.resourceCount(),
                view.assignmentCount(),
                view.submissionCount(),
                view.createdAt(),
                view.updatedAt());
    }
}
