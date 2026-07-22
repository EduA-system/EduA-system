package com.edua.beeduasystem.domain.model.ai;

import java.time.Instant;
import java.util.UUID;

public record AiSystemPrompt(AiPromptKey key, String instruction, UUID updatedBy, Instant updatedAt) {
}
