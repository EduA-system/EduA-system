package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ReplaceModeratorRequest(
        @NotBlank @Email String replacementEmail,
        boolean disablePrevious,
        List<Integer> previousTeacherGrades
) {
}
