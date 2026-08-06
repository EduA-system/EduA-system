package com.edua.beeduasystem.presentation.dto.weeklytask;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

/**
 * Moderator giao 1 (hoặc nhiều) bài cho mọi Teacher active cùng subject + khối trong 1 tuần (bulk UC-81,
 * BR-51). UI hiện tại luôn gửi đúng 1 phần tử trong {@code lessons} — mỗi ô lịch tuần = 1 bài; giữ dạng
 * danh sách để linh hoạt về sau. {@code textbookCode} dùng chung cho cả batch (1 modal = 1 sách, theo
 * khối đã chọn). Không nhận {@code deadline} — server tự tính từ {@code weekStartDate}, dùng chung cho cả
 * batch (BR-52).
 */
public record BulkCreateWeeklyTaskRequest(
        @NotNull LocalDate weekStartDate,
        @NotNull Integer grade,
        @NotBlank String textbookCode,
        @NotEmpty @Valid List<LessonSlot> lessons
) {
    public record LessonSlot(@NotBlank String scopeDescription, @NotBlank String chapterCode, @NotBlank String lessonCode) {
    }
}
