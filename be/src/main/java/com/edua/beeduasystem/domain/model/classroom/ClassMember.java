package com.edua.beeduasystem.domain.model.classroom;

import java.time.Instant;
import java.util.UUID;

public record ClassMember(
        UUID id,
        UUID classId,
        UUID studentId,
        Instant joinedAt
) {
}
