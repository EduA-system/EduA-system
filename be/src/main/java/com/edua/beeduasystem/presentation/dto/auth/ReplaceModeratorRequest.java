package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ReplaceModeratorRequest(
        @NotBlank @Email String replacementEmail,
        boolean disablePrevious
) {
}
