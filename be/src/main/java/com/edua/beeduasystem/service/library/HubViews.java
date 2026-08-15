package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * View model ở tầng service cho Community Hub: content đã APPROVED kèm tên chủ sở hữu
 * (resolve từ {@code app_users}) và số bình luận — những thứ không nằm trong domain model.
 */
public final class HubViews {

    private HubViews() {
    }

    /** Dòng tóm tắt trong feed công khai, không kèm payload đầy đủ. */
    public record ContentSummary(
            UUID id,
            LibraryContentType type,
            String title,
            Subject subject,
            UUID ownerId,
            String ownerName,
            String thumbnailUrl,
            Instant reviewedAt,
            long commentCount
    ) {
    }

    /** Chi tiết content kèm payload đầy đủ và danh sách bình luận — dùng cho guest preview. */
    public record ContentDetail(
            UUID id,
            LibraryContentType type,
            String title,
            Subject subject,
            UUID ownerId,
            String ownerName,
            JsonNode payload,
            String thumbnailUrl,
            Instant reviewedAt,
            List<CommentView> comments
    ) {
    }

    /** Một bình luận kèm tên người viết. */
    public record CommentView(
            UUID id,
            String content,
            UUID authorId,
            UUID parentCommentId,
            String authorName,
            String authorAvatarUrl,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    /** Trang kết quả danh sách content. */
    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long total
    ) {
    }
}
