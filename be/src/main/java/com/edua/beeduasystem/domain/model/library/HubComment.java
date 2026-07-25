package com.edua.beeduasystem.domain.model.library;

import java.time.Instant;
import java.util.UUID;

/** Bình luận trên một content Community Hub đang APPROVED. */
public record HubComment(
        UUID id,
        UUID libraryContentId,
        UUID authorId,
        String content,
        Instant createdAt,
        Instant updatedAt
) {
}
