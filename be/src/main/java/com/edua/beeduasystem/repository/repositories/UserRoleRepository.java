package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserRole;

import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface UserRoleRepository {

    Set<Role> findRolesByUserId(UUID userId);

    void save(UserRole userRole);

    /** userId -> granterUserId */
    Map<UUID, UUID> findGrantedByUserIdsByUserIds(Collection<UUID> userIds, Role role);

    /** userId -> grantedAt */
    Map<UUID, Instant> findGrantedAtsByUserIds(Collection<UUID> userIds, Role role);

    /** Tạo mới hoặc cập nhật granted_by/granted_at (dùng khi reactivate). */
    void assignOrUpdateRole(UUID userId, UUID roleId, UUID grantedBy, Instant grantedAt);
}
