package com.edua.beeduasystem.presentation.dto.molecule;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MoleculeBuildRequest(
        @NotBlank(message = "Hãy nhập tên hoặc công thức chất.")
        @Size(max = 200, message = "Yêu cầu không được quá 200 ký tự.")
        String input) {
}
