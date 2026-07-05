package com.edua.beeduasystem.presentation.dto.blog;

/** Tạo bình luận trên một bài blog. */
public record CreateBlogCommentRequest(
        String content
) {
}
