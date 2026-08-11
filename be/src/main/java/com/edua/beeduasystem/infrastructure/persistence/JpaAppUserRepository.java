package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.infrastructure.persistence.entity.AppUserEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.AppUserJpaRepository;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    @Transactional(readOnly = true)
    public Page<AppUser> findAllByRole(Role role, Pageable pageable) {
        return jpa.findByRoleName(role.name(), pageable).map(JpaAppUserRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AppUser> findAllByRoleAndSubject(Role role, Subject subject, Pageable pageable) {
        return jpa.findByRoleNameAndSubject(role.name(), subject, pageable).map(JpaAppUserRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsActiveByRoleAndSubject(Role role, Subject subject) {
        return jpa.existsActiveByRoleNameAndSubject(role.name(), subject);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsActiveByRole(Role role) {
        return jpa.existsActiveByRoleName(role.name());
    }

    @Override
    @Transactional(readOnly = true)
    public StatusCounts countStatusByRole(Role role, Subject subject) {
        List<Object[]> rows = jpa.countStatusByRoleRaw(role.name(), subject != null ? subject.name() : null);
        if (rows.isEmpty()) {
            return new StatusCounts(0, 0);
        }
        Object[] row = rows.get(0);
        return new StatusCounts(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleStatusAggregate> countActiveInactiveByRole(Subject subject) {
        return jpa.countActiveInactiveByRoleRaw(subject != null ? subject.name() : null).stream()
                .map(row -> new RoleStatusAggregate(Role.valueOf((String) row[0]), (Boolean) row[1], ((Number) row[2]).longValue()))
                .toList();
    }

    @Override
    @Transactional
    public AppUser save(AppUser user) {
        AppUserEntity e = jpa.findById(user.id()).orElseGet(AppUserEntity::new);
        e.setId(user.id());
        e.setEmail(user.email());
        e.setGoogleSub(user.googleSub());
        e.setFullName(user.fullName());
        e.setAvatarUrl(user.avatarUrl());
        e.setContactInfo(user.contactInfo());
        e.setBio(user.bio());
        e.setPhoneNumber(user.phoneNumber());
        e.setDateOfBirth(user.dateOfBirth());
        e.setSubject(user.subject());
        e.setStatus(user.status());
        e.setCreatedAt(user.createdAt() != null ? user.createdAt() : Instant.now());
        e.setLastLoginAt(user.lastLoginAt());
        return toDomain(jpa.save(e));
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        jpa.deleteById(id);
    }

    private static AppUser toDomain(AppUserEntity e) {
        return new AppUser(
                e.getId(),
                e.getEmail(),
                e.getGoogleSub(),
                e.getFullName(),
                e.getAvatarUrl(),
                e.getContactInfo(),
                e.getBio(),
                e.getPhoneNumber(),
                e.getSubject(),
                e.getStatus(),
                e.getCreatedAt(),
                e.getLastLoginAt(),
                e.getDateOfBirth());
    }
}
