package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.notification.CreateNotificationRequest;
import com.edua.beeduasystem.service.notification.NotificationService;
import com.edua.beeduasystem.service.notification.NotificationViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Notifications: Moderator gửi bản tin tới Teacher cùng subject; mọi user xem/quản lý inbox của mình.
 * Spec: designs/API_designs/notifications.md.
 */
@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Thông báo: Moderator gửi tới Teacher cùng subject; user xem/quản lý inbox của mình")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Create Notifications", description = "Moderator gửi thông báo tới toàn bộ Teacher cùng subject với mình.")
    public NotificationViews.NotificationCreated create(@Valid @RequestBody CreateNotificationRequest request) {
        return notificationService.create(request.title(), request.content());
    }

    @GetMapping
    @Operation(summary = "View & Manage My Notifications", description = "Danh sách notification của tôi, mới nhất trước. `unread=true` để lọc chưa đọc.")
    public NotificationViews.Page<NotificationViews.NotificationSummary> list(
            @RequestParam(defaultValue = "false") boolean unread,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.listMine(unread, PageRequest.of(page, size, Sort.unsorted()));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Số notification chưa đọc", description = "Dùng cho badge trên nav, không load cả danh sách.")
    public NotificationViews.UnreadCount unreadCount() {
        return new NotificationViews.UnreadCount(notificationService.unreadCount());
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Đánh dấu 1 notification đã đọc")
    public void markRead(@PathVariable UUID id) {
        notificationService.markRead(id);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Đánh dấu tất cả notification của tôi là đã đọc")
    public void markAllRead() {
        notificationService.markAllRead();
    }
}
