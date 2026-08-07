package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.service.classroom.ClassResourceViews;

import java.time.Instant;
import java.util.UUID;

public record ClassResourceSummaryDto(
        UUID id,
        String title,
        String description,
        ResourceSourceType sourceType,
        String thumbnailUrl,
        AttachmentDto attachment,
        boolean submissionEnabled,
        Instant deadline,
        String postedByName,
        Instant postedAt,
        SubmissionStatus submissionStatus
) {
    public record AttachmentDto(
            String fileName,
            String url,
            String contentType,
            Long sizeBytes
    ) {
        static AttachmentDto from(ClassResourceViews.Attachment attachment) {
            if (attachment == null) {
                return null;
            }
            return new AttachmentDto(attachment.fileName(), attachment.url(), attachment.contentType(), attachment.sizeBytes());
        }
    }

    public static ClassResourceSummaryDto from(ClassResourceViews.ResourceSummary view) {
        return new ClassResourceSummaryDto(
                view.id(),
                view.title(),
                view.description(),
                view.sourceType(),
                view.thumbnailUrl(),
                AttachmentDto.from(view.attachment()),
                view.submissionEnabled(),
                view.deadline(),
                view.postedByName(),
                view.postedAt(),
                view.submissionStatus());
    }
}
