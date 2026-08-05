package com.edua.beeduasystem.domain.model.blog;

import com.edua.beeduasystem.domain.model.auth.Subject;

import java.time.Instant;
import java.util.UUID;

/**
 * Bài viết blog cộng đồng. Nội dung là HTML đã sanitize (soạn bằng cùng editor lesson-plan).
 * {@code authorName} không thuộc model này — được service resolve từ {@code app_users} khi dựng view.
 */
public record BlogPost(
        UUID id,
        UUID authorId,
        String title,
        String content,
        String thumbnailUrl,
        Subject subject,
        BlogPostStatus status,
        String removedReason,
        UUID removedBy,
        Instant createdAt,
        Instant updatedAt
) {
    public boolean isPublished() {
        return status == BlogPostStatus.PUBLISHED;
    }
}
