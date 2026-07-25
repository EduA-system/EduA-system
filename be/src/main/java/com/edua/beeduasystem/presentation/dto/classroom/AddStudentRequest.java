package com.edua.beeduasystem.presentation.dto.classroom;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record AddStudentRequest(
        @NotBlank(message = "Truong nay la bat buoc.")
        @Email(message = "Vui long nhap dia chi email hop le.")
        String email
) {
}
