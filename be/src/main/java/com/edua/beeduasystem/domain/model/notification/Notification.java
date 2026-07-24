package com.edua.beeduasystem.domain.model.notification;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.UUID;

/** Bản tin do Moderator gửi tới toàn bộ Teacher cùng subject. */
public record Notification(
        UUID id,
        UUID senderId,
        Subject subject,
        String title,
        String content,
        Instant createdAt
) {
}
