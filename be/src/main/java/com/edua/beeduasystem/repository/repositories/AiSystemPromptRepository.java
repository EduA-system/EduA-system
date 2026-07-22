package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.domain.model.ai.AiSystemPrompt;

import java.util.List;
import java.util.Optional;

public interface AiSystemPromptRepository {
    List<AiSystemPrompt> findAll();
    Optional<AiSystemPrompt> findByKey(AiPromptKey key);
    AiSystemPrompt save(AiSystemPrompt prompt);
}
