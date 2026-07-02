package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;

import java.util.UUID;

/** Thông tin user trả cho FE (không lộ trường nhạy cảm). */
public record UserDto(
        UUID id,
        String email,
        String fullName,
        String role,
        String subject
) {
    public static UserDto from(AppUser user) {
        return new UserDto(
                user.id(),
                user.email(),
                user.fullName(),
                user.role().name(),
                user.subject() != null ? user.subject().name() : null);
    }
}
