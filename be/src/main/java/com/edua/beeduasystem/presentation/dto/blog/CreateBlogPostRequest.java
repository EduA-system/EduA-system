package com.edua.beeduasystem.presentation.dto.blog;

/** Tạo bài blog. {@code subject} ∈ {MATH, CHEMISTRY, PHYSICS}; {@code content} là HTML (sẽ được sanitize). */
public record CreateBlogPostRequest(
        String title,
        String content,
        String subject,
        String thumbnailUrl
) {
}
