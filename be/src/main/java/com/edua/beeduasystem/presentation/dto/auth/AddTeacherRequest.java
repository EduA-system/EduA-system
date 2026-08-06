package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record AddTeacherRequest(
        @NotBlank @Email String email,
        @NotBlank String subject,
        String fullName,
        @NotEmpty List<Integer> grades
) {
}
