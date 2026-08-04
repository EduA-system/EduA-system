package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassMemberViews;

/**
 * Kết quả xóa học sinh khỏi lớp. {@code mode}: HARD_DELETE (INVITED, xóa sạch cả tài khoản) |
 * SOFT_REMOVE (chỉ gỡ khỏi lớp, giữ nguyên dữ liệu). {@code notified} = đã gửi thông báo lý do cho học sinh.
 */
public record RemoveStudentResponse(
        String mode,
        boolean notified
) {
    public static RemoveStudentResponse from(ClassMemberViews.RemoveResult result) {
        return new RemoveStudentResponse(result.mode(), result.notified());
    }
}
