package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Moderator giao Weekly Task cho 1 Teacher cùng subject (UC-81). Subject lấy từ user hiện tại. */
public record CreateWeeklyTaskRequest(
        @NotNull UUID teacherId,
        @NotNull LocalDate weekStartDate,
        @NotBlank String scopeDescription,
        @NotNull Instant deadline
) {
}
