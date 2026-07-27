package com.edua.beeduasystem.domain.model.weeklytask;

import com.edua.beeduasystem.domain.model.auth.Subject;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Weekly Task: Moderator giao yêu cầu giáo án cho 1 Teacher cùng subject, kèm hạn nộp (UC-80..89).
 * {@code reviewStatus} độc lập với Publish Status (Hub) của {@code LibraryContent}.
 */
public record WeeklyTask(
        UUID id,
        UUID moderatorId,
        Subject subject,
        UUID teacherId,
        LocalDate weekStartDate,
        String scopeDescription,
        Instant deadline,
        WeeklyTaskReviewStatus reviewStatus,
        UUID sourceLibraryContentId,
        String sourceDocumentUrl,
        String sourceDocumentName,
        Instant submittedAt,
        UUID reviewedBy,
        Instant reviewedAt,
        String rejectionReason,
        Instant createdAt,
        Instant updatedAt
) {
}
