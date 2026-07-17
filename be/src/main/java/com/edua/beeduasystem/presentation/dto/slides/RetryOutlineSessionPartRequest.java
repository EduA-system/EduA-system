package com.edua.beeduasystem.presentation.dto.slides;

/** Retry request backed by the immutable generation snapshot held by the session. */
public record RetryOutlineSessionPartRequest(String sessionId, String partId) { }
