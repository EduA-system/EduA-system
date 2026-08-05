package com.edua.beeduasystem.service.notification;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * View model ở tầng service cho notification: kèm tên người gửi (resolve từ {@code app_users})
 * và trạng thái đã đọc — những thứ không nằm trong domain model. Controller map các record này sang DTO.
 */
public final class NotificationViews {

    private NotificationViews() {
    }

    /** Một dòng trong inbox của recipient, kèm trạng thái đã đọc riêng của họ. */
    public record NotificationSummary(
            UUID id,
            String title,
            String content,
            Subject subject,
            String senderName,
            Instant createdAt,
            String targetType,
            String targetUrl,
            boolean read
    ) {
    }

    /** Kết quả tạo notification: bản tin vừa gửi + số người nhận. */
    public record NotificationCreated(
            UUID id,
            String title,
            String content,
            Subject subject,
            String senderName,
            Instant createdAt,
            String targetType,
            String targetUrl,
            int recipientCount
    ) {
    }

    /** Trang kết quả danh sách notification, kèm tổng số chưa đọc của recipient hiện tại. */
    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long total,
            long unreadCount
    ) {
    }

    /** Số notification chưa đọc — response cho badge. */
    public record UnreadCount(long count) {
    }
}
