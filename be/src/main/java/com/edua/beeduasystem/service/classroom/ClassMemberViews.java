package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.classroom.ClassMemberStatus;

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
            ClassMemberStatus membershipStatus,
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

    /** 1 dong loi khi import all-or-nothing; neu co error thi khong ghi bat ky hoc sinh nao. */
    public record ImportError(
            int row,
            String email,
            String reason,
            String message
    ) {
    }

    public record ImportResult(
            int addedCount,
            int createdCount,
            int rejoinedCount,
            int errorCount,
            List<ImportError> errors
    ) {
    }

    /** Thông tin tài khoản cũ trả kèm 409 PROFILE_MISMATCH để FE yêu cầu nhập đúng hồ sơ. */
    public record ExistingAccountInfo(
            String email,
            String fullName,
            String phoneNumber,
            LocalDate dateOfBirth,
            UserStatus status
    ) {
    }

    /** Kết quả xóa học sinh khỏi lớp. {@code mode}: SOFT_REMOVE (giữ dữ liệu). */
    public record RemoveResult(
            String mode,
            boolean notified
    ) {
    }
}
