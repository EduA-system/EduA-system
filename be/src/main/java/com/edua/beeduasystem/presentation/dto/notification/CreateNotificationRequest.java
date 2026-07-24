package com.edua.beeduasystem.presentation.dto.notification;

import jakarta.validation.constraints.NotBlank;

/** Moderator gửi thông báo tới Teacher cùng subject với mình (subject lấy từ user hiện tại, không nằm trong request). */
public record CreateNotificationRequest(
        @NotBlank String title,
        @NotBlank String content
) {
}
