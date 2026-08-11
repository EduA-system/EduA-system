package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;

import java.util.List;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/** Thông tin user trả cho FE (không lộ trường nhạy cảm). */
public record UserDto(
        UUID id,
        String email,
        String fullName,
        String avatarUrl,
        String contactInfo,
        String bio,
        String phoneNumber,
        LocalDate dateOfBirth,
        String role,
        List<String> roles,
        String subject,
        List<Integer> grades
) {
    public static UserDto from(AppUser user, Set<Role> roles) {
        return from(user, roles, List.of());
    }

    public static UserDto from(AppUser user, Set<Role> roles, List<Integer> grades) {
        List<String> orderedRoles = Role.orderedByPriority(roles).stream().map(Enum::name).toList();
        return new UserDto(
                user.id(),
                user.email(),
                user.fullName(),
                user.avatarUrl(),
                user.contactInfo(),
                user.bio(),
                user.phoneNumber(),
                user.dateOfBirth(),
                orderedRoles.isEmpty() ? null : orderedRoles.getFirst(),
                orderedRoles,
                user.subject() != null ? user.subject().name() : null,
                grades == null ? List.of() : grades);
    }
}
