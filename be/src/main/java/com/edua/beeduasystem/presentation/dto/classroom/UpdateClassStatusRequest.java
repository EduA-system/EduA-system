package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateClassStatusRequest(
        @NotNull ClassStatus status
) {
}
