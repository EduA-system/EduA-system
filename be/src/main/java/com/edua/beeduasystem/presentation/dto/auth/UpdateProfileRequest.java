package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateProfileRequest(
        @Size(max = 255, message = "Tên hiển thị không được vượt quá 255 ký tự.")
        String fullName,

        @Size(max = 1024, message = "URL ảnh đại diện không được vượt quá 1024 ký tự.")
        String avatarUrl,

        @Size(max = 500, message = "Thông tin liên hệ không được vượt quá 500 ký tự.")
        String contactInfo,

        @Size(max = 1000, message = "Giới thiệu ngắn không được vượt quá 1000 ký tự.")
        String bio,

        @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự.")
        String phoneNumber,

        LocalDate dateOfBirth
) {
}
