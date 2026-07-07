package com.edua.beeduasystem.domain.model.auth;

import java.util.Set;
import java.util.UUID;

/** Claims rút ra từ access JWT sau khi verify. */
public record AccessTokenClaims(
        UUID userId,
        String email,
        Set<Role> roles,
        Subject subject
) {
    public Role primaryRole() {
        if (roles.contains(Role.ADMINISTRATOR)) return Role.ADMINISTRATOR;
        if (roles.contains(Role.MODERATOR)) return Role.MODERATOR;
        return Role.TEACHER;
    }
}
