package com.edua.beeduasystem.presentation.dto.blog;

import java.util.UUID;

/** Tạo bình luận trên một bài blog. */
public record CreateBlogCommentRequest(
        String content,
        UUID parentCommentId
) {
}
