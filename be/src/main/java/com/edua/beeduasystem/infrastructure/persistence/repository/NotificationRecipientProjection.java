package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.UUID;

/** Projection: 1 notification kèm trạng thái đọc của recipient đang query (join notifications + notification_recipients). */
public interface NotificationRecipientProjection {
    UUID getNotificationId();

    UUID getSenderId();

    Subject getSubject();

    String getTitle();

    String getContent();

    Instant getCreatedAt();

    Instant getReadAt();
}
