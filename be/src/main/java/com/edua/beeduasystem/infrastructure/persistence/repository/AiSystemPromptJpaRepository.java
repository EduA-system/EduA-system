package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.AiSystemPromptEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiSystemPromptJpaRepository extends JpaRepository<AiSystemPromptEntity, String> {
}
