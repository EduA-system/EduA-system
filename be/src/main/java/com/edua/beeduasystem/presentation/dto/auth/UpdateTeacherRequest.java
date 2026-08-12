package com.edua.beeduasystem.presentation.dto.auth;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record UpdateTeacherRequest(
        @Size(max = 255, message = "Tên hiển thị không được vượt quá 255 ký tự.")
        String fullName,

        @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự.")
        String phoneNumber,

        LocalDate dateOfBirth,

        @NotEmpty(message = "Vui lòng chọn ít nhất một khối.")
        List<Integer> grades
) {
}
