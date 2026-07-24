package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.UUID;

/** Envelope STOMP đẩy tới recipient khi có notification mới. */
public record NotificationEvent(
        UUID id,
        String title,
        String content,
        Subject subject,
        String senderName,
        Instant createdAt
) {
}
