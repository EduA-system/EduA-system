package com.edua.beeduasystem.presentation.dto.blog;

/** Sửa bài blog (partial): trường nào {@code null} thì giữ nguyên. */
public record UpdateBlogPostRequest(
        String title,
        String content,
        String subject,
        String thumbnailUrl
) {
}
