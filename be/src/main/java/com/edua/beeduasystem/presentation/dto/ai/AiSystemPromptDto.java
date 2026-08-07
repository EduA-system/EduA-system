package com.edua.beeduasystem.presentation.dto.ai;

import com.edua.beeduasystem.domain.model.ai.AiSystemPrompt;
import java.time.Instant;

public record AiSystemPromptDto(String key, String instruction, Instant updatedAt) {
    public static AiSystemPromptDto from(AiSystemPrompt prompt) {
        return new AiSystemPromptDto(prompt.key().name(), prompt.instruction(), prompt.updatedAt());
    }
}
