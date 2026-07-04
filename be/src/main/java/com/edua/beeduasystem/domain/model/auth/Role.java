package com.edua.beeduasystem.domain.model.auth;

/** Vai trò chính (RBAC — SEC-04). Ánh xạ authority Spring: {@code ROLE_<name>}. */
public enum Role {
    TEACHER,
    MODERATOR,
    ADMINISTRATOR
}
