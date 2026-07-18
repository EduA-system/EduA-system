package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddItManagerRequest(@NotBlank @Email String email, String fullName) {}
