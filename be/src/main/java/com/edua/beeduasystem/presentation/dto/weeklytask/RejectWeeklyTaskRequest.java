package com.edua.beeduasystem.presentation.dto.weeklytask;

/** Moderator từ chối submission — {@code reason} bắt buộc (UC-89). */
public record RejectWeeklyTaskRequest(
        String reason
) {
}
