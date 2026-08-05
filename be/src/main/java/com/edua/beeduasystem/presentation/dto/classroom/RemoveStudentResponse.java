package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassMemberViews;

/** Kết quả xóa học sinh khỏi lớp. {@code mode}: SOFT_REMOVE — chỉ gỡ khỏi lớp, giữ nguyên dữ liệu. */
public record RemoveStudentResponse(
        String mode,
        boolean notified
) {
    public static RemoveStudentResponse from(ClassMemberViews.RemoveResult result) {
        return new RemoveStudentResponse(result.mode(), result.notified());
    }
}
