package com.edua.beeduasystem.presentation.dto.classroom;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record AddStudentRequest(
        @NotBlank(message = "Họ và tên là bắt buộc.") @Size(max = 255)
        String fullName,
        @NotBlank(message = "Số điện thoại là bắt buộc.") @Size(max = 30)
        String phoneNumber,
        @Past(message = "Ngày sinh phải ở trong quá khứ.")
        LocalDate dateOfBirth,
        @NotBlank(message = "Truong nay la bat buoc.")
        @Email(message = "Vui long nhap dia chi email hop le.")
        String email,
        /** true khi giáo viên xác nhận gán lại tài khoản cũ (bỏ qua kiểm tra khớp hồ sơ) — dùng sau khi gặp 409 PROFILE_MISMATCH. */
        Boolean reuseExistingAccount
) {
}
