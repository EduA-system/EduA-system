package com.edua.beeduasystem.service.notification;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case Notifications: Moderator gửi bản tin broadcast tới Teacher cùng subject (Create Notifications);
 * mọi user xem/quản lý inbox của mình (View & Manage My Notifications). Xem thiết kế:
 * {@code designs/API_designs/notifications.md}.
 */
@Service
public class NotificationService {

    private static final int TITLE_MAX_LENGTH = 200;
    private static final int CONTENT_MAX_LENGTH = 2000;

    private final NotificationRepository notificationRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUser;
    private final NotificationStreamPort streamPort;

    public NotificationService(NotificationRepository notificationRepository,
                               AppUserRepository userRepository,
                               CurrentUserProvider currentUser,
                               NotificationStreamPort streamPort) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.streamPort = streamPort;
    }

    /** Moderator gửi thông báo tới toàn bộ Teacher cùng subject với mình. */
    @Transactional
    public NotificationViews.NotificationCreated create(String rawTitle, String rawContent) {
        Subject moderatorSubject = currentUser.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để gửi thông báo.");
        }
        String title = requireText(rawTitle, TITLE_MAX_LENGTH, "Tiêu đề");
        String content = requireText(rawContent, CONTENT_MAX_LENGTH, "Nội dung");
        UUID senderId = currentUser.requireUserId();
        Instant now = Instant.now();

        List<UUID> recipientIds = userRepository
                .findAllByRoleAndSubject(Role.TEACHER, moderatorSubject, Pageable.unpaged())
                .getContent().stream()
                .map(AppUser::id)
                .toList();

        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, moderatorSubject, title, content, now),
                recipientIds);

        String senderName = displayName(senderId);
        NotificationEvent event = new NotificationEvent(
                saved.id(), saved.title(), saved.content(), saved.subject(), senderName, saved.createdAt());
        recipientIds.forEach(recipientId -> streamPort.publishNew(recipientId, event));

        return new NotificationViews.NotificationCreated(
                saved.id(), saved.title(), saved.content(), saved.subject(),
                senderName, saved.createdAt(), recipientIds.size());
    }

    /** Danh sách notification của user hiện tại, mới nhất trước. */
    @Transactional(readOnly = true)
    public NotificationViews.Page<NotificationViews.NotificationSummary> listMine(boolean unreadOnly, Pageable pageable) {
        UUID userId = currentUser.requireUserId();
        Page<NotificationRepository.RecipientNotification> page =
                notificationRepository.findForRecipient(userId, unreadOnly, pageable);

        Map<UUID, String> senderNames = resolveSenderNames(
                page.getContent().stream().map(NotificationRepository.RecipientNotification::senderId).toList());

        List<NotificationViews.NotificationSummary> items = page.getContent().stream()
                .map(r -> new NotificationViews.NotificationSummary(
                        r.id(), r.title(), r.content(), r.subject(),
                        senderNames.get(r.senderId()), r.createdAt(), r.readAt() != null))
                .toList();

        long unreadCount = notificationRepository.countUnreadForRecipient(userId);
        return new NotificationViews.Page<>(items, pageable.getPageNumber(), pageable.getPageSize(),
                page.getTotalElements(), unreadCount);
    }

    /** Số notification chưa đọc của user hiện tại — dùng cho badge. */
    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countUnreadForRecipient(currentUser.requireUserId());
    }

    /** Đánh dấu 1 notification đã đọc (no-op nếu đã đọc trước đó). */
    @Transactional
    public void markRead(UUID notificationId) {
        boolean existed = notificationRepository.markRead(notificationId, currentUser.requireUserId());
        if (!existed) {
            throw new ResourceNotFoundException("Notification not found.");
        }
    }

    /** Đánh dấu toàn bộ notification chưa đọc của user hiện tại là đã đọc. */
    @Transactional
    public void markAllRead() {
        notificationRepository.markAllRead(currentUser.requireUserId());
    }

    private Map<UUID, String> resolveSenderNames(Collection<UUID> senderIds) {
        return userRepository.findAllById(senderIds.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(AppUser::id, NotificationService::displayName, (a, b) -> a));
    }

    private String displayName(UUID userId) {
        return userRepository.findById(userId).map(NotificationService::displayName).orElse(null);
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }

    private static String requireText(String raw, int maxLength, String fieldLabel) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException(fieldLabel + " không được để trống.");
        }
        String trimmed = raw.trim();
        if (trimmed.length() > maxLength) {
            throw new IllegalArgumentException(fieldLabel + " không được vượt quá " + maxLength + " ký tự.");
        }
        return trimmed;
    }
}
