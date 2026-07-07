package com.edua.beeduasystem.domain.model.auth;

import java.time.Instant;
import java.util.UUID;

/**
 * Người dùng hệ thống. Tồn tại một dòng = email đã được Admin/Moderator cấp quyền (allowlist, BR-01).
 * Không lưu mật khẩu (SEC-01); danh tính do Google xác thực.
 * Vai trò (role) được lưu ở bảng user_roles (nhiều-nhiều).
 */
public record AppUser(
        UUID id,
        String email,
        String googleSub,
        String fullName,
        Subject subject,
        UserStatus status,
        Instant createdAt,
        Instant lastLoginAt
) {
    public boolean isActiveOrInvited() {
        return status == UserStatus.INVITED || status == UserStatus.ACTIVE;
    }
}
