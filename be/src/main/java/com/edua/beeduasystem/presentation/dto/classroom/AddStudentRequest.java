package com.edua.beeduasystem.presentation.dto.classroom;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AddStudentRequest(
        @NotBlank(message = "Họ và tên là bắt buộc.") @Size(max = 255)
        String fullName,
        @NotBlank(message = "Số điện thoại là bắt buộc.") @Size(max = 30)
        @Pattern(regexp = "^0[35789]\\d{8}$", message = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.")
        String phoneNumber,
        @NotNull(message = "Ngày sinh là bắt buộc.")
        @Past(message = "Ngày sinh phải ở trong quá khứ.")
        LocalDate dateOfBirth,
        @NotBlank(message = "Truong nay la bat buoc.")
        @Email(message = "Vui long nhap dia chi email hop le.")
        String email
) {
}
