package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;

import java.time.Instant;
import java.util.UUID;

public record TeacherDto(
        UUID id,
        String email,
        String fullName,
        String subject,
        String status,
        Instant grantedAt,
        String grantedByEmail
) {
    public static TeacherDto from(AppUser user, Instant grantedAt, String grantedByEmail) {
        return new TeacherDto(
                user.id(),
                user.email(),
                user.fullName(),
                user.subject() != null ? user.subject().name() : null,
                user.status().name(),
                grantedAt,
                grantedByEmail);
    }
}
