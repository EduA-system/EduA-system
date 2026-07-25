package com.edua.beeduasystem.presentation.dto.library;

/** Moderator từ chối content submitted — {@code reason} bắt buộc. */
public record RejectLibraryContentRequest(
        String reason
) {
}
