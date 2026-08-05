package com.edua.beeduasystem.domain.model.blog;

import java.time.Instant;
import java.util.UUID;

/** Bình luận trên một bài blog — kênh tự điều tiết cộng đồng (BR-22). */
public record BlogComment(
        UUID id,
        UUID postId,
        UUID authorId,
        UUID parentCommentId,
        String content,
        Instant createdAt,
        Instant updatedAt,
        Instant hiddenAt,
        UUID hiddenBy
) {
}
