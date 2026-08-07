package com.edua.beeduasystem.presentation.dto.ai;

import jakarta.validation.constraints.NotNull;

public record UpdateAiSystemPromptRequest(@NotNull String instruction) {}
