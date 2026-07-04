package com.edua.beeduasystem.domain.model.auth;

import java.util.UUID;

/** Claims rút ra từ access JWT sau khi verify. */
public record AccessTokenClaims(
        UUID userId,
        String email,
        Role role,
        Subject subject
) {
}
