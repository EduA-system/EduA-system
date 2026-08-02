package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.auth.Subject;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateClassRequest(
        @Size(max = 255) String name,
        Subject subject,
        @Min(10) @Max(12) Integer grade,
        @Size(max = 2000) String description
) {
}
