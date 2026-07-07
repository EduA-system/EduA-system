package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Thông tin user trả cho FE (không lộ trường nhạy cảm). */
public record UserDto(
        UUID id,
        String email,
        String fullName,
        String role,
        List<String> roles,
        String subject
) {
    public static UserDto from(AppUser user, Set<Role> roles) {
        return new UserDto(
                user.id(),
                user.email(),
                user.fullName(),
                roles.stream().findFirst().map(Enum::name).orElse(null),
                roles.stream().map(Enum::name).toList(),
                user.subject() != null ? user.subject().name() : null);
    }
}
