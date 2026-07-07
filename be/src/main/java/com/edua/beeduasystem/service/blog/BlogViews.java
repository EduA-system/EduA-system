package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * View model ở tầng service cho blog: bài/bình luận đã kèm tên tác giả (resolve từ {@code app_users})
 * và số bình luận — những thứ không nằm trong domain model. Controller map các record này sang DTO.
 */
public final class BlogViews {

    private BlogViews() {
    }

    /** Một bình luận kèm tên người viết. */
    public record CommentView(
            UUID id,
            String content,
            UUID authorId,
            String authorName,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    /** Dòng tóm tắt trong danh sách bài: kèm đoạn trích văn bản + thumbnail (nếu có), không kèm HTML đầy đủ. */
    public record PostSummary(
            UUID id,
            String title,
            Subject subject,
            UUID authorId,
            String authorName,
            Instant createdAt,
            long commentCount,
            String excerpt,
            String thumbnailUrl
    ) {
    }

    /** Chi tiết bài kèm nội dung HTML và danh sách bình luận. */
    public record PostDetail(
            UUID id,
            String title,
            String content,
            Subject subject,
            UUID authorId,
            String authorName,
            Instant createdAt,
            Instant updatedAt,
            List<CommentView> comments
    ) {
    }

    /** Trang kết quả danh sách bài. */
    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long total
    ) {
    }
}
