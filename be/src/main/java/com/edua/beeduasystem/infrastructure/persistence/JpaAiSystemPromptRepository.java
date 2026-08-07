package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.domain.model.ai.AiSystemPrompt;
import com.edua.beeduasystem.infrastructure.persistence.entity.AiSystemPromptEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.AiSystemPromptJpaRepository;
import com.edua.beeduasystem.repository.repositories.AiSystemPromptRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class JpaAiSystemPromptRepository implements AiSystemPromptRepository {
    private final AiSystemPromptJpaRepository jpa;

    public JpaAiSystemPromptRepository(AiSystemPromptJpaRepository jpa) { this.jpa = jpa; }

    @Override @Transactional(readOnly = true)
    public List<AiSystemPrompt> findAll() { return jpa.findAll().stream().map(JpaAiSystemPromptRepository::toDomain).toList(); }

    @Override @Transactional(readOnly = true)
    public Optional<AiSystemPrompt> findByKey(AiPromptKey key) { return jpa.findById(key.name()).map(JpaAiSystemPromptRepository::toDomain); }

    @Override @Transactional
    public AiSystemPrompt save(AiSystemPrompt prompt) {
        AiSystemPromptEntity entity = jpa.findById(prompt.key().name()).orElseGet(AiSystemPromptEntity::new);
        entity.setPromptKey(prompt.key().name());
        entity.setInstruction(prompt.instruction());
        entity.setUpdatedBy(prompt.updatedBy());
        entity.setUpdatedAt(prompt.updatedAt());
        return toDomain(jpa.save(entity));
    }

    private static AiSystemPrompt toDomain(AiSystemPromptEntity entity) {
        return new AiSystemPrompt(AiPromptKey.valueOf(entity.getPromptKey()), entity.getInstruction(), entity.getUpdatedBy(), entity.getUpdatedAt());
    }
}
