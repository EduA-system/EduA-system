package com.edua.beeduasystem.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_system_prompts")
@Getter @Setter @NoArgsConstructor
public class AiSystemPromptEntity {
    @Id
    @Column(name = "prompt_key", nullable = false, length = 40)
    private String promptKey;
    @Column(nullable = false, columnDefinition = "TEXT")
    private String instruction;
    @Column(name = "updated_by")
    private UUID updatedBy;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
