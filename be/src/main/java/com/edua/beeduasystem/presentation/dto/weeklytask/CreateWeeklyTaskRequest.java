package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Moderator giao Weekly Task cho 1 Teacher cùng subject + khối (UC-81, BR-51), gắn 1 Chương + 1 Bài chọn
 * từ danh mục SGK (BR-53). Subject lấy từ user hiện tại. Không nhận {@code deadline} — server tự tính từ
 * {@code weekStartDate} (BR-52). {@code scopeDescription} là Tiêu đề Mod tự nhập (không phải mô tả tự do
 * chương/bài nữa).
 */
public record CreateWeeklyTaskRequest(
        @NotNull UUID teacherId,
        @NotNull LocalDate weekStartDate,
        @NotNull Integer grade,
        @NotBlank String scopeDescription,
        @NotBlank String textbookCode,
        @NotBlank String chapterCode,
        @NotBlank String lessonCode
) {
}
