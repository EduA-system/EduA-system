package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.infrastructure.persistence.entity.NotificationEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.NotificationRecipientEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.NotificationJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.NotificationRecipientJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.NotificationRecipientProjection;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class JpaNotificationRepository implements NotificationRepository {

    private final NotificationJpaRepository notificationJpa;
    private final NotificationRecipientJpaRepository recipientJpa;

    public JpaNotificationRepository(NotificationJpaRepository notificationJpa,
                                     NotificationRecipientJpaRepository recipientJpa) {
        this.notificationJpa = notificationJpa;
        this.recipientJpa = recipientJpa;
    }

    @Override
    @Transactional
    public Notification createWithRecipients(Notification notification, List<UUID> recipientIds) {
        NotificationEntity entity = new NotificationEntity();
        entity.setId(notification.id());
        entity.setSenderId(notification.senderId());
        entity.setSubject(notification.subject());
        entity.setTitle(notification.title());
        entity.setContent(notification.content());
        entity.setCreatedAt(notification.createdAt());
        notificationJpa.save(entity);

        Instant now = Instant.now();
        List<NotificationRecipientEntity> recipients = recipientIds.stream().map(recipientId -> {
            NotificationRecipientEntity r = new NotificationRecipientEntity();
            r.setId(UUID.randomUUID());
            r.setNotificationId(notification.id());
            r.setRecipientId(recipientId);
            r.setReadAt(null);
            r.setCreatedAt(now);
            return r;
        }).toList();
        recipientJpa.saveAll(recipients);

        return notification;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RecipientNotification> findForRecipient(UUID recipientId, boolean unreadOnly, Pageable pageable) {
        Page<NotificationRecipientProjection> page = recipientJpa.findForRecipient(recipientId, unreadOnly, pageable);
        return page.map(p -> new RecipientNotification(
                p.getNotificationId(), p.getSenderId(), p.getSubject(),
                p.getTitle(), p.getContent(), p.getCreatedAt(), p.getReadAt()));
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnreadForRecipient(UUID recipientId) {
        return recipientJpa.countByRecipientIdAndReadAtIsNull(recipientId);
    }

    @Override
    @Transactional
    public boolean markRead(UUID notificationId, UUID recipientId) {
        var found = recipientJpa.findByNotificationIdAndRecipientId(notificationId, recipientId);
        if (found.isEmpty()) {
            return false;
        }
        NotificationRecipientEntity recipient = found.get();
        if (recipient.getReadAt() == null) {
            recipient.setReadAt(Instant.now());
            recipientJpa.save(recipient);
        }
        return true;
    }

    @Override
    @Transactional
    public void markAllRead(UUID recipientId) {
        recipientJpa.markAllRead(recipientId, Instant.now());
    }
}
