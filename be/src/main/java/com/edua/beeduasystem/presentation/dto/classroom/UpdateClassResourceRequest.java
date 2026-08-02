package com.edua.beeduasystem.presentation.dto.classroom;

import java.time.Instant;

public record UpdateClassResourceRequest(
        String title,
        String description,
        ClassResourceAttachmentRequest attachment,
        Boolean submissionEnabled,
        Instant deadline
) {
}
