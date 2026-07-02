package com.edua.beeduasystem.presentation.dto.auth;

/** Response cho login/refresh: access token (FE giữ memory) + user. Refresh token đi qua cookie. */
public record AuthResponse(
        String accessToken,
        UserDto user
) {
}
