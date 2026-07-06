package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.infrastructure.persistence.entity.AppUserEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.AppUserJpaRepository;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaAppUserRepository implements AppUserRepository {

    private final AppUserJpaRepository jpa;

    public JpaAppUserRepository(AppUserJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AppUser> findByEmail(String email) {
        return jpa.findByEmail(email).map(JpaAppUserRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AppUser> findById(UUID id) {
        return jpa.findById(id).map(JpaAppUserRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppUser> findAllById(Collection<UUID> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return jpa.findAllById(ids).stream().map(JpaAppUserRepository::toDomain).toList();
    }

    @Override
    @Transactional
    public AppUser save(AppUser user) {
        AppUserEntity e = jpa.findById(user.id()).orElseGet(AppUserEntity::new);
        e.setId(user.id());
        e.setEmail(user.email());
        e.setGoogleSub(user.googleSub());
        e.setFullName(user.fullName());
        e.setRole(user.role());
        e.setSubject(user.subject());
        e.setStatus(user.status());
        e.setCreatedAt(user.createdAt() != null ? user.createdAt() : Instant.now());
        e.setLastLoginAt(user.lastLoginAt());
        return toDomain(jpa.save(e));
    }

    private static AppUser toDomain(AppUserEntity e) {
        return new AppUser(
                e.getId(),
                e.getEmail(),
                e.getGoogleSub(),
                e.getFullName(),
                e.getRole(),
                e.getSubject(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getLastLoginAt());
    }
}
