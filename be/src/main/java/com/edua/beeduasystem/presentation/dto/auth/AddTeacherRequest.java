package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddTeacherRequest(
        @NotBlank @Email String email,
        @NotBlank String subject,
        String fullName
) {
}
