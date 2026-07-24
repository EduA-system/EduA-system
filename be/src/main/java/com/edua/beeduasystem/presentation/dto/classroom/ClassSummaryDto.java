package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.service.classroom.ClassViews;

import java.time.Instant;
import java.util.UUID;

public record ClassSummaryDto(
        UUID id,
        String name,
        Subject subject,
        Integer grade,
        long memberCount,
        ClassStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static ClassSummaryDto from(ClassViews.ClassSummary view) {
        return new ClassSummaryDto(
                view.id(),
                view.name(),
                view.subject(),
                view.grade(),
                view.memberCount(),
                view.status(),
                view.createdAt(),
                view.updatedAt());
    }
}
