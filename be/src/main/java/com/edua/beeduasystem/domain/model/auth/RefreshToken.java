package com.edua.beeduasystem.domain.model.auth;

import java.time.Instant;
import java.util.UUID;

/** Refresh token đã lưu (chỉ giữ hash). */
public record RefreshToken(
        UUID id,
        UUID userId,
        String tokenHash,
        Instant expiresAt,
        boolean revoked,
        Instant createdAt
) {
    public boolean isUsable(Instant now) {
        return !revoked && expiresAt.isAfter(now);
    }
}
