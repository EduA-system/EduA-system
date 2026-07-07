package com.edua.beeduasystem.domain.model.auth;

import java.time.Instant;
import java.util.UUID;

/** Một role assignment: user có quyền gì, ai cấp, khi nào. */
public record UserRole(
        UUID id,
        UUID userId,
        UUID roleId,
        UUID grantedBy,
        Instant grantedAt
) {
}
