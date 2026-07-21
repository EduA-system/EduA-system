package com.edua.beeduasystem.presentation.dto.slides;

/** Retry request for one slide backed by the immutable generation snapshot held by the session. */
public record RetryOutlineSessionSlideRequest(String sessionId, String partId, String slideId) { }
