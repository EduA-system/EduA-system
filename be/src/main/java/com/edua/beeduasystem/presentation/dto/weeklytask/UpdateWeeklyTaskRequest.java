package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Moderator sửa Weekly Task còn hạn (UC-82) — full-replace, mọi field đều bắt buộc. */
public record UpdateWeeklyTaskRequest(
        @NotNull UUID teacherId,
        @NotNull LocalDate weekStartDate,
        @NotBlank String scopeDescription,
        @NotNull Instant deadline
) {
}
