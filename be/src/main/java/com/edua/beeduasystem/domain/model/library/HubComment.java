package com.edua.beeduasystem.domain.model.library;

import java.time.Instant;
import java.util.UUID;

/** Bình luận trên một content Community Hub đang APPROVED. */
public record HubComment(
        UUID id,
        UUID libraryContentId,
        UUID authorId,
        UUID parentCommentId,
        String content,
        Instant createdAt,
        Instant updatedAt,
        Instant hiddenAt,
        UUID hiddenBy
) {
    public HubComment(UUID id,
                      UUID libraryContentId,
                      UUID authorId,
                      String content,
                      Instant createdAt,
                      Instant updatedAt) {
        this(id, libraryContentId, authorId, null, content, createdAt, updatedAt, null, null);
    }
}
