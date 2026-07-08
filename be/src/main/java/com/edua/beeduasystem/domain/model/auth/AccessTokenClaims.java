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
        return Role.primaryOf(roles);
    }
}
