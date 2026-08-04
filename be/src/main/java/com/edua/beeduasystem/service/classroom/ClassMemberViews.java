package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.auth.UserStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class ClassMemberViews {

    private ClassMemberViews() {
    }

    public record MemberSummary(
            UUID id,
            UUID studentId,
            String studentEmail,
            String studentName,
            UserStatus studentStatus,
            Instant joinedAt
    ) {
    }

    public record Page(
            List<MemberSummary> items,
            int page,
            int size,
            long total
    ) {
    }

    /** 1 dong bi bo qua khi import — {@code reason}: INVALID_FORMAT | DUPLICATE_IN_FILE | ALREADY_ENROLLED | ROLE_CONFLICT | ACCOUNT_DISABLED | CLASS_FULL. */
    public record SkippedRow(
            int row,
            String email,
            String reason
    ) {
    }

    public record ImportResult(
            int addedCount,
            int skippedCount,
            List<SkippedRow> skipped
    ) {
    }

    /** Thông tin tài khoản cũ trả kèm 409 PROFILE_MISMATCH để FE hỏi "gán lại account cũ vào lớp không?". */
    public record ExistingAccountInfo(
            String email,
            String fullName,
            String phoneNumber,
            LocalDate dateOfBirth,
            UserStatus status
    ) {
    }

    /** Kết quả xóa học sinh khỏi lớp. {@code mode}: HARD_DELETE (INVITED, xóa sạch) | SOFT_REMOVE (giữ dữ liệu). */
    public record RemoveResult(
            String mode,
            boolean notified
    ) {
    }
}
