package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SubmissionViews {

    private SubmissionViews() {
    }

    /** Input file tu controller khi Submit (UC-47) - tach khoi DTO tang presentation. */
    public record FileInput(
            String url,
            String fileName,
            String contentType,
            Long sizeBytes
    ) {
    }

    public record FileDetail(
            String fileName,
            String url,
            String contentType,
            Long sizeBytes
    ) {
    }

    public record Detail(
            UUID id,
            String textContent,
            List<FileDetail> files,
            SubmissionStatus status,
            Instant submittedAt
    ) {
    }

    /**
     * 1 hang trong danh sach bai nop cua Teacher (UC-44) - moi hoc sinh enrolled deu co 1 hang.
     * {@code firstSubmittedAt} != {@code submittedAt} nghia la hoc sinh da nop lai it nhat 1 lan
     * (upsert ghi de theo BR-36, khong dem duoc chinh xac so lan sua, chi biet co sua hay khong).
     */
    public record RosterEntry(
            UUID studentId,
            String studentName,
            String studentEmail,
            SubmissionStatus status,
            Instant firstSubmittedAt,
            Instant submittedAt
    ) {
    }

    public record Roster(
            UUID resourceId,
            Instant deadline,
            List<RosterEntry> items
    ) {
    }

    /** Chi tiet 1 bai nop nhin tu phia Teacher (UC-45) - kem dinh danh hoc sinh. */
    public record TeacherDetail(
            UUID studentId,
            String studentName,
            String textContent,
            List<FileDetail> files,
            SubmissionStatus status,
            Instant firstSubmittedAt,
            Instant submittedAt
    ) {
    }
}
