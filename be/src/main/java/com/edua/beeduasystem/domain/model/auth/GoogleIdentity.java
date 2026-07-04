package com.edua.beeduasystem.domain.model.auth;

/** Danh tính đã verify từ Google id_token. */
public record GoogleIdentity(
        String subject,
        String email,
        String fullName,
        boolean emailVerified
) {
}
