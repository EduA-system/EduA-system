package com.edua.beeduasystem.presentation.dto.auth;

/** Body cho POST /api/auth/google. */
public record GoogleLoginRequest(String idToken) {
}
