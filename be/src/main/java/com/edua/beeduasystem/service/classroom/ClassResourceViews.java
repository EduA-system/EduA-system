package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ClassResourceViews {

    private ClassResourceViews() {
    }

    public record Attachment(
            String fileName,
            String url,
            String contentType,
            Long sizeBytes
    ) {
    }

    public record ResourceSummary(
            UUID id,
            String title,
            String description,
            ResourceSourceType sourceType,
            String thumbnailUrl,
            Attachment attachment,
            boolean submissionEnabled,
            Instant deadline,
            String postedByName,
            Instant postedAt,
            SubmissionStatus submissionStatus
    ) {
    }

    public record Page(
            List<ResourceSummary> items,
            int page,
            int size,
            long total
    ) {
    }
}
