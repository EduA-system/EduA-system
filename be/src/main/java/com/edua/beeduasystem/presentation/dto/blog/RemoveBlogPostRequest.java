package com.edua.beeduasystem.presentation.dto.blog;

/** Moderator gỡ bài vi phạm — {@code reason} bắt buộc (BR-21). */
public record RemoveBlogPostRequest(
        String reason
) {
}
