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
}
