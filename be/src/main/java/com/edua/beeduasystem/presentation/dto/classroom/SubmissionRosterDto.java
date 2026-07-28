package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.service.classroom.SubmissionViews;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SubmissionRosterDto(
        UUID resourceId,
        Instant deadline,
        List<EntryDto> items
) {
    public record EntryDto(
            UUID studentId,
            String studentName,
            String studentEmail,
            SubmissionStatus status,
            Instant submittedAt
    ) {
        static EntryDto from(SubmissionViews.RosterEntry entry) {
            return new EntryDto(
                    entry.studentId(), entry.studentName(), entry.studentEmail(), entry.status(), entry.submittedAt());
        }
    }

    public static SubmissionRosterDto from(SubmissionViews.Roster view) {
        return new SubmissionRosterDto(
                view.resourceId(),
                view.deadline(),
                view.items().stream().map(EntryDto::from).toList());
    }
}
