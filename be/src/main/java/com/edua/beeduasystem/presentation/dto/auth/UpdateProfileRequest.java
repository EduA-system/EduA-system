package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 255, message = "Tên hiển thị không được vượt quá 255 ký tự.")
        String fullName,

        @Size(max = 1024, message = "URL ảnh đại diện không được vượt quá 1024 ký tự.")
        String avatarUrl,

        @Size(max = 500, message = "Thông tin liên hệ không được vượt quá 500 ký tự.")
        String contactInfo
) {
}
