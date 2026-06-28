package com.edua.beeduasystem.presentation.dto.slides;

public record GenerateOutlineResponse(String sessionId, String topic, String outlineTopic, OutlineDto outline) {
}
