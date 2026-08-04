package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.notification.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Truy cập notification + trạng thái đọc theo từng recipient. Service phụ thuộc interface này;
 * JPA impl ở {@code infrastructure/persistence}.
 */
public interface NotificationRepository {

    /** Tạo 1 notification + fan-out 1 dòng recipient cho mỗi id trong {@code recipientIds}. */
    Notification createWithRecipients(Notification notification, List<UUID> recipientIds);

    /** Danh sách notification của một recipient, mới nhất trước. {@code unreadOnly} lọc chưa đọc. */
    Page<RecipientNotification> findForRecipient(UUID recipientId, boolean unreadOnly, Pageable pageable);

    /** Số notification chưa đọc của một recipient. */
    long countUnreadForRecipient(UUID recipientId);

    /** Đánh dấu đã đọc (no-op nếu đã đọc trước đó). Trả {@code false} nếu recipient không tồn tại (không phải người nhận). */
    boolean markRead(UUID notificationId, UUID recipientId);

    /** Đánh dấu toàn bộ notification chưa đọc của recipient là đã đọc. */
    void markAllRead(UUID recipientId);

    /** Xóa toàn bộ dòng recipient của một user (dùng khi hard-delete tài khoản). */
    void deleteRecipientsByRecipientId(UUID recipientId);

    /** Notification kèm trạng thái đọc riêng của một recipient cụ thể. */
    record RecipientNotification(
            UUID id,
            UUID senderId,
            Subject subject,
            String title,
            String content,
            Instant createdAt,
            Instant readAt
    ) {
    }
}
