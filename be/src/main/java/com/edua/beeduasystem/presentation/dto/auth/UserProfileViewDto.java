package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Hồ sơ read-only của MỘT người khác mà current user có quan hệ quản lý hợp lệ.
 * Xem {@code UserProfileViewService} cho luật xác định ai được xem ai.
 */
public record UserProfileViewDto(
        UUID id,
        String fullName,
        String avatarUrl,
        String email,
        String bio,
        Role role,
        Subject subject,
        List<Integer> grades,
        UserStatus status,
        Instant grantedAt,
        String grantedByName
) {
}
