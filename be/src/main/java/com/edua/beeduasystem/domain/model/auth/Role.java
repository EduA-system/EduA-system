package com.edua.beeduasystem.domain.model.auth;

import java.util.List;
import java.util.Set;

/** Vai trò chính (RBAC — SEC-04). Ánh xạ authority Spring: {@code ROLE_<name>}. */
public enum Role {
    TEACHER,
    MODERATOR,
    ADMINISTRATOR,
    IT_MANAGEMENT;

    private static final List<Role> PRIORITY = List.of(ADMINISTRATOR, IT_MANAGEMENT, MODERATOR, TEACHER);

    public static Role primaryOf(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            throw new IllegalArgumentException("User must have at least one role.");
        }
        return PRIORITY.stream()
                .filter(roles::contains)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("User has no supported role."));
    }

    public static List<Role> orderedByPriority(Set<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return List.of();
        }
        return PRIORITY.stream()
                .filter(roles::contains)
                .toList();
    }
}
