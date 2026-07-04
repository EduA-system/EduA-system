package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.RefreshToken;

import java.util.Optional;
import java.util.UUID;

/**
 * Lưu trữ refresh token (chỉ hash). JPA impl ở {@code infrastructure/persistence}.
 */
public interface RefreshTokenRepository {

    RefreshToken save(RefreshToken token);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Đánh dấu revoked một token. */
    void revoke(UUID id);

    /** Revoke toàn bộ token còn hiệu lực của user (reuse detection / logout-all). */
    void revokeAllByUserId(UUID userId);
}
