package com.edua.beeduasystem.presentation.dto.library;

/** Báo cáo một content Community Hub vi phạm — {@code reason} bắt buộc. */
public record CreateHubReportRequest(
        String reason
) {
}
