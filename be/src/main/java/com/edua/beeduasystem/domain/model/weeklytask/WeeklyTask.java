package com.edua.beeduasystem.domain.model.weeklytask;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Weekly Task: Moderator giao yêu cầu giáo án cho 1 Teacher cùng subject + khối, kèm hạn nộp (UC-80..89).
 * {@code reviewStatus} độc lập với Publish Status (Hub) của {@code LibraryContent}.
 * {@code grade} (10/11/12, BR-51): mỗi task thuộc đúng 1 khối, giáo viên nhận task phải dạy khối đó
 * (xem {@code teacher_grades}). {@code deadline} (BR-52): server tự tính từ {@code weekStartDate}
 * (Chủ Nhật 23:59:59 giờ VN của chính tuần đó), không nhận từ client.
 * {@code scopeDescription}: Tiêu đề Mod tự nhập (KHÔNG phải mô tả tự do chương/bài nữa — xem field dưới).
 * {@code textbookCode}/{@code chapterCode}/{@code chapterName}/{@code lessonCode}/{@code lessonName}
 * (BR-53, {@code designs/weekly-task/grade-scoped-deadline-and-review.md}): 1 task gắn đúng 1 Chương +
 * 1 Bài trong SGK, chọn qua dropdown lấy từ danh mục SGK ({@code TextbookCatalogRepository}) — không phải
 * mô tả tự do. {@code chapterName}/{@code lessonName} do server tự resolve/denormalize tại thời điểm tạo,
 * không nhận trực tiếp từ client.
 */
public record WeeklyTask(
        UUID id,
        UUID moderatorId,
        Subject subject,
        Integer grade,
        UUID teacherId,
        LocalDate weekStartDate,
        String scopeDescription,
        String textbookCode,
        String chapterCode,
        String chapterName,
        String lessonCode,
        String lessonName,
        Instant deadline,
        WeeklyTaskReviewStatus reviewStatus,
        UUID sourceLibraryContentId,
        String sourceLibraryContentTitle,
        JsonNode sourceLibraryContentPayload,
        String sourceDocumentUrl,
        String sourceDocumentName,
        Instant submittedAt,
        UUID reviewedBy,
        Instant reviewedAt,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt,
        Long version
) {
}
