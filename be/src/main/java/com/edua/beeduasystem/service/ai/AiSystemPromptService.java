package com.edua.beeduasystem.service.ai;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.domain.model.ai.AiSystemPrompt;
import com.edua.beeduasystem.repository.repositories.AiSystemPromptRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Service
public class AiSystemPromptService {
    private final AiSystemPromptRepository repository;
    private final CurrentUserProvider currentUserProvider;
    private final AiPromptTemplateCatalog templateCatalog;

    public AiSystemPromptService(
            AiSystemPromptRepository repository,
            CurrentUserProvider currentUserProvider,
            AiPromptTemplateCatalog templateCatalog) {
        this.repository = repository;
        this.currentUserProvider = currentUserProvider;
        this.templateCatalog = templateCatalog;
    }

    @Transactional(readOnly = true)
    public List<AiSystemPrompt> list() {
        return Arrays.stream(AiPromptKey.values())
                .map(key -> repository.findByKey(key)
                        .filter(prompt -> prompt.instruction() != null && !prompt.instruction().isBlank())
                        .orElseGet(() -> new AiSystemPrompt(key, templateCatalog.defaultInstruction(key), null, null)))
                .toList();
    }

    @Transactional
    public AiSystemPrompt update(AiPromptKey key, String instruction) {
        String normalized = instruction == null ? "" : instruction.strip();
        return repository.save(new AiSystemPrompt(key, normalized, currentUserProvider.requireUserId(), Instant.now()));
    }

    /**
     * Applies the IT-managed instruction to the actual prompt sent to the model.
     * When the generated prompt starts with the known default instruction, replace
     * that default block. For prompts whose first lines include runtime values,
     * put the IT instruction first while preserving schema and data boundaries.
     */
    @Transactional(readOnly = true)
    public String apply(AiPromptKey key, String fixedPrompt) {
        String instruction = repository.findByKey(key)
                .map(AiSystemPrompt::instruction)
                .filter(value -> !value.isBlank())
                .orElseGet(() -> templateCatalog.defaultInstruction(key));
        String normalizedInstruction = instruction.strip();
        String defaultInstruction = templateCatalog.defaultInstruction(key).strip();
        if (normalizedInstruction.equals(defaultInstruction)) return fixedPrompt;
        String replaceablePrefix = templateCatalog.replaceableInstructionPrefix(key).strip();
        if (fixedPrompt != null && fixedPrompt.startsWith(replaceablePrefix)) {
            return normalizedInstruction + fixedPrompt.substring(replaceablePrefix.length());
        }
        return "<business_instruction>\n" + instruction.strip() + "\n</business_instruction>\n"
                + "Apply the business instruction above as the primary behavior. The following runtime data, output schema, "
                + "and safety/data-boundary constraints are mandatory and must remain valid.\n\n" + fixedPrompt;
    }

}
