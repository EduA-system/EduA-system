package com.edua.beeduasystem.presentation.dto.library;

import java.util.UUID;

/** Tạo bình luận trên một content Community Hub. */
public record CreateHubCommentRequest(
        String content,
        UUID parentCommentId
) {
}
