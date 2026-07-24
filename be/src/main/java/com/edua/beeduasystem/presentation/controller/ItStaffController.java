package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.presentation.dto.ai.AiSystemPromptDto;
import com.edua.beeduasystem.presentation.dto.ai.UpdateAiSystemPromptRequest;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/it-staff/system-prompts")
@PreAuthorize("hasRole('IT_STAFF')")
public class ItStaffController {
    private final AiSystemPromptService service;
    public ItStaffController(AiSystemPromptService service) { this.service = service; }
    @GetMapping public List<AiSystemPromptDto> list() { return service.list().stream().map(AiSystemPromptDto::from).toList(); }
    @PutMapping("/{key}") public AiSystemPromptDto update(@PathVariable AiPromptKey key, @Valid @RequestBody UpdateAiSystemPromptRequest request) {
        return AiSystemPromptDto.from(service.update(key, request.instruction()));
    }
}
