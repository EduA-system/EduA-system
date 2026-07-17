package com.edua.beeduasystem.presentation.dto.slides;

public record RetryOutlinePartRequest(
        String sessionId,
        GenerateOutlineRequest generationRequest,
        OutlineDto outline,
        String partId
) {
}
