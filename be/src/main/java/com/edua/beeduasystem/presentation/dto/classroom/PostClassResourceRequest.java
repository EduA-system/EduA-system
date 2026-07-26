package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.UUID;

public record PostClassResourceRequest(
        String title,
        String description,
        @NotNull ResourceSourceType sourceType,
        UUID sourceLibraryContentId,
        ClassResourceAttachmentRequest attachment,
        boolean submissionEnabled,
        Instant deadline
) {
}
