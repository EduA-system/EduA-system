package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.service.classroom.ClassMemberViews;

import java.time.Instant;
import java.util.UUID;

public record ClassMemberDto(
        UUID id,
        UUID studentId,
        String studentEmail,
        String studentName,
        UserStatus studentStatus,
        Instant joinedAt
) {
    public static ClassMemberDto from(ClassMemberViews.MemberSummary view) {
        return new ClassMemberDto(
                view.id(),
                view.studentId(),
                view.studentEmail(),
                view.studentName(),
                view.studentStatus(),
                view.joinedAt());
    }
}
