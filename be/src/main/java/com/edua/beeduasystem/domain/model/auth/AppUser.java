package com.edua.beeduasystem.domain.model.auth;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Người dùng hệ thống. Tồn tại một dòng = email đã được Principal/Moderator cấp quyền (allowlist, BR-01).
 * Không lưu mật khẩu (SEC-01); danh tính do Google xác thực.
 * Vai trò (role) được lưu ở bảng user_roles (nhiều-nhiều).
 */
public record AppUser(
        UUID id,
        String email,
        String googleSub,
        String fullName,
        String avatarUrl,
        String contactInfo,
        String bio,
        String phoneNumber,
        Subject subject,
        UserStatus status,
        Instant createdAt,
        Instant lastLoginAt,
        LocalDate dateOfBirth
) {
    public AppUser(UUID id,
                   String email,
                   String googleSub,
                   String fullName,
                   String avatarUrl,
                   String contactInfo,
                   Subject subject,
                   UserStatus status,
                   Instant createdAt,
                   Instant lastLoginAt) {
        this(id, email, googleSub, fullName, avatarUrl, contactInfo, null, null,
                subject, status, createdAt, lastLoginAt, null);
    }

    public AppUser(UUID id, String email, String googleSub, String fullName, String avatarUrl, String contactInfo,
                   String bio, String phoneNumber, Subject subject, UserStatus status, Instant createdAt, Instant lastLoginAt) {
        this(id, email, googleSub, fullName, avatarUrl, contactInfo, bio, phoneNumber, subject, status, createdAt, lastLoginAt, null);
    }

    public boolean isActiveOrInvited() {
        return status == UserStatus.INVITED || status == UserStatus.ACTIVE;
    }
}
