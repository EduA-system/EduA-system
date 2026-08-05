package com.edua.beeduasystem.presentation.dto.classroom;

/**
 * Yêu cầu xóa mềm học sinh khỏi lớp. {@code reason} là ghi chú tùy chọn cho membership bị gỡ.
 */
public record RemoveStudentRequest(
        String reason
) {
}
