package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserRole;
import com.edua.beeduasystem.infrastructure.persistence.entity.RoleEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.UserRoleEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.RoleJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.UserRoleJpaRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class JpaUserRoleRepository implements UserRoleRepository {

    private final UserRoleJpaRepository jpa;
    private final RoleJpaRepository roleJpa;

    public JpaUserRoleRepository(UserRoleJpaRepository jpa, RoleJpaRepository roleJpa) {
        this.jpa = jpa;
        this.roleJpa = roleJpa;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<Role> findRolesByUserId(UUID userId) {
        List<UserRoleEntity> userRoles = jpa.findByUserId(userId);
        if (userRoles.isEmpty()) {
            return Collections.emptySet();
        }
        Set<UUID> roleIds = userRoles.stream().map(UserRoleEntity::getRoleId).collect(Collectors.toSet());
        List<RoleEntity> roleEntities = roleJpa.findAllById(roleIds);
        return roleEntities.stream()
                .map(r -> Role.valueOf(r.getName()))
                .collect(Collectors.toSet());
    }

    @Override
    @Transactional
    public void save(UserRole userRole) {
        UserRoleEntity e = jpa.findById(userRole.id()).orElseGet(UserRoleEntity::new);
        e.setId(userRole.id());
        e.setUserId(userRole.userId());
        e.setRoleId(userRole.roleId());
        e.setGrantedBy(userRole.grantedBy());
        e.setGrantedAt(userRole.grantedAt());
        jpa.save(e);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, UUID> findGrantedByUserIdsByUserIds(Collection<UUID> userIds, Role role) {
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<UUID> roleIds = resolveRoleIds(role);
        List<UserRoleEntity> userRoles = jpa.findByUserIdIn(List.copyOf(userIds));
        Map<UUID, UUID> result = new HashMap<>();
        for (UserRoleEntity ur : userRoles) {
            if (roleIds.contains(ur.getRoleId()) && ur.getGrantedBy() != null) {
                result.put(ur.getUserId(), ur.getGrantedBy());
            }
        }
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, Instant> findGrantedAtsByUserIds(Collection<UUID> userIds, Role role) {
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Set<UUID> roleIds = resolveRoleIds(role);
        List<UserRoleEntity> userRoles = jpa.findByUserIdIn(List.copyOf(userIds));
        Map<UUID, Instant> result = new HashMap<>();
        for (UserRoleEntity ur : userRoles) {
            if (roleIds.contains(ur.getRoleId()) && ur.getGrantedAt() != null) {
                result.put(ur.getUserId(), ur.getGrantedAt());
            }
        }
        return result;
    }

    @Override
    @Transactional
    public void replaceRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt) {
        UUID roleId = resolveRoleId(role);
        List<UserRoleEntity> existing = jpa.findByUserId(userId);
        UserRoleEntity retained = existing.stream()
                .filter(ur -> ur.getRoleId().equals(roleId))
                .findFirst()
                .orElse(existing.isEmpty() ? null : existing.getFirst());

        for (UserRoleEntity e : existing) {
            if (retained == null || !e.getId().equals(retained.getId())) {
                jpa.delete(e);
            }
        }

        if (retained != null) {
            retained.setRoleId(roleId);
            retained.setGrantedBy(grantedBy);
            retained.setGrantedAt(grantedAt);
            jpa.save(retained);
        } else {
            UserRoleEntity e = new UserRoleEntity();
            e.setId(UUID.randomUUID());
            e.setUserId(userId);
            e.setRoleId(roleId);
            e.setGrantedBy(grantedBy);
            e.setGrantedAt(grantedAt);
            jpa.save(e);
        }
    }

    private Set<UUID> resolveRoleIds(Role role) {
        return roleJpa.findAll().stream()
                .filter(r -> r.getName().equals(role.name()))
                .map(RoleEntity::getId)
                .collect(Collectors.toSet());
    }

    private UUID resolveRoleId(Role role) {
        return roleJpa.findByName(role.name())
                .orElseThrow(() -> new IllegalStateException("Role " + role.name() + " not found in DB"))
                .getId();
    }
}
