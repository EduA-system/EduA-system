package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Moderator sửa Weekly Task còn hạn (UC-82) — full-replace các field còn lại đều bắt buộc. Không nhận
 * {@code grade} (khối giữ nguyên từ lúc tạo, BR-51) hay {@code deadline} (server tự tính lại từ
 * {@code weekStartDate}, BR-52). Chương/Bài (BR-53) sửa được — Mod có thể đổi bài đã giao.
 */
public record UpdateWeeklyTaskRequest(
        @NotNull UUID teacherId,
        @NotNull LocalDate weekStartDate,
        @NotBlank String scopeDescription,
        @NotBlank String textbookCode,
        @NotBlank String chapterCode,
        @NotBlank String lessonCode
) {
}
