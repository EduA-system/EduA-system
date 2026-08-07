package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import com.edua.beeduasystem.service.activitylog.ActivityLogViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

/**
 * View & Filter Activity Log (SRS UC-11): IT Staff xem/lọc audit trail (login, thay đổi tài khoản,
 * quyết định kiểm duyệt, thay đổi cấu hình AI) theo actor / loại hành động / khoảng thời gian.
 */
@RestController
@RequestMapping("/api/it-staff/activity-log")
@PreAuthorize("hasRole('IT_STAFF')")
@Tag(name = "Activity Log", description = "IT Staff xem/lọc nhật ký hoạt động hệ thống")
public class ActivityLogController {

    private final ActivityLogService service;

    public ActivityLogController(ActivityLogService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "View & Filter Activity Log",
            description = "Lọc theo actorId, category (AUTH/ACCOUNT/MODERATION/CONFIG), và khoảng thời gian [from, to].")
    public ActivityLogViews.Page<ActivityLogViews.Summary> list(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) ActivityLogCategory category,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.search(actorId, category, from, to, page, size);
    }
}
