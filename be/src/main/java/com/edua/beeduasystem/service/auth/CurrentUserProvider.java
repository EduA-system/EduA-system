package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Đọc user hiện tại từ SecurityContext (principal = {@link AccessTokenClaims} do JwtAuthenticationFilter set).
 * Dùng cho {@code /me} và owner-check (BR-16).
 */
@Component
public class CurrentUserProvider {

    public Optional<AccessTokenClaims> current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AccessTokenClaims claims) {
            return Optional.of(claims);
        }
        return Optional.empty();
    }

    public AccessTokenClaims require() {
        return current().orElseThrow(() -> new InvalidTokenException("Not authenticated."));
    }

    public UUID requireUserId() {
        return require().userId();
    }
}
