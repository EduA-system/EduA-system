package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.NotificationRecipientEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRecipientJpaRepository extends JpaRepository<NotificationRecipientEntity, UUID> {

    Optional<NotificationRecipientEntity> findByNotificationIdAndRecipientId(UUID notificationId, UUID recipientId);

    long countByRecipientIdAndReadAtIsNull(UUID recipientId);

    @Query("SELECT n.id AS notificationId, n.senderId AS senderId, n.subject AS subject, "
            + "n.title AS title, n.content AS content, n.createdAt AS createdAt, nr.readAt AS readAt "
            + "FROM NotificationRecipientEntity nr, NotificationEntity n "
            + "WHERE nr.notificationId = n.id AND nr.recipientId = :recipientId "
            + "AND (:unreadOnly = false OR nr.readAt IS NULL) "
            + "ORDER BY n.createdAt DESC")
    Page<NotificationRecipientProjection> findForRecipient(
            @Param("recipientId") UUID recipientId,
            @Param("unreadOnly") boolean unreadOnly,
            Pageable pageable);

    @Modifying
    @Query("UPDATE NotificationRecipientEntity nr SET nr.readAt = :now "
            + "WHERE nr.recipientId = :recipientId AND nr.readAt IS NULL")
    void markAllRead(@Param("recipientId") UUID recipientId, @Param("now") Instant now);
}
