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

    void lockRole(Role role);

    void save(UserRole userRole);

    /** userId -> granterUserId */
    Map<UUID, UUID> findGrantedByUserIdsByUserIds(Collection<UUID> userIds, Role role);

    /** userId -> grantedAt */
    Map<UUID, Instant> findGrantedAtsByUserIds(Collection<UUID> userIds, Role role);

    /** Assign the user's single effective role, replacing any previous role assignment. */
    void replaceRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt);

    /** Xóa toàn bộ role của user (dùng khi hard-delete tài khoản). */
    void deleteByUserId(UUID userId);
}
