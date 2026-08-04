package com.edua.beeduasystem.presentation.dto.classroom;

/**
 * Yêu cầu xóa học sinh khỏi lớp. {@code reason} bắt buộc khi học sinh đã kích hoạt (ACTIVE)
 * để đẩy thông báo kèm lý do cho học sinh; không bắt buộc với học sinh chưa từng đăng nhập (INVITED).
 */
public record RemoveStudentRequest(
        String reason
) {
}
