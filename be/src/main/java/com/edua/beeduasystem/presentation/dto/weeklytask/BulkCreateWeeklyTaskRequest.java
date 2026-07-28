package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Moderator giao cùng lúc N bài cho mọi Teacher active cùng subject trong 1 tuần (bulk UC-81). */
public record BulkCreateWeeklyTaskRequest(
        @NotNull LocalDate weekStartDate,
        @NotEmpty @Valid List<LessonSlot> lessons
) {
    public record LessonSlot(@NotBlank String scopeDescription, @NotNull Instant deadline) {
    }
}
