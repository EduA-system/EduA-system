package com.edua.beeduasystem.domain.model.auth;

import org.springframework.security.core.AuthenticatedPrincipal;

import java.util.Set;
import java.util.UUID;

/**
 * Claims rút ra từ access JWT sau khi verify. Implement {@link AuthenticatedPrincipal} (getName = userId)
 * để STOMP {@code SimpMessagingTemplate.convertAndSendToUser} route đúng theo userId thay vì fallback
 * về {@code toString()} của record.
 */
public record AccessTokenClaims(
        UUID userId,
        String email,
        Set<Role> roles,
        Subject subject
) implements AuthenticatedPrincipal {
    public Role primaryRole() {
        return Role.primaryOf(roles);
    }

    @Override
    public String getName() {
        return userId.toString();
    }
}
