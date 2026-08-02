package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.RefreshToken;
import com.edua.beeduasystem.infrastructure.persistence.entity.RefreshTokenEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.RefreshTokenJpaRepository;
import com.edua.beeduasystem.repository.repositories.RefreshTokenRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaRefreshTokenRepository implements RefreshTokenRepository {

    private final RefreshTokenJpaRepository jpa;

    public JpaRefreshTokenRepository(RefreshTokenJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public RefreshToken save(RefreshToken token) {
        RefreshTokenEntity e = new RefreshTokenEntity();
        e.setId(token.id());
        e.setUserId(token.userId());
        e.setTokenHash(token.tokenHash());
        e.setExpiresAt(token.expiresAt());
        e.setRevoked(token.revoked());
        e.setCreatedAt(token.createdAt() != null ? token.createdAt() : Instant.now());
        return toDomain(jpa.save(e));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<RefreshToken> findByTokenHash(String tokenHash) {
        return jpa.findByTokenHash(tokenHash).map(JpaRefreshTokenRepository::toDomain);
    }

    @Override
    @Transactional
    public void revoke(UUID id) {
        jpa.revokeById(id);
    }

    @Override
    @Transactional
    public void revokeAllByUserId(UUID userId) {
        jpa.revokeAllByUserId(userId);
    }

    private static RefreshToken toDomain(RefreshTokenEntity e) {
        return new RefreshToken(
                e.getId(),
                e.getUserId(),
                e.getTokenHash(),
                e.getExpiresAt(),
                e.isRevoked(),
                e.getCreatedAt());
    }
}
