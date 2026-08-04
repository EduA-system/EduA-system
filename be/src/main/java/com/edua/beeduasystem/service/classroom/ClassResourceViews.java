package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.fasterxml.jackson.databind.JsonNode;

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

    /** Input tu controller khi Post/Update resource (UC-38/39) — tach khoi DTO tang presentation. */
    public record AttachmentInput(
            String url,
            String fileName,
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

    /**
     * Noi dung cua tai nguyen thu vien duoc chia se trong lop. Chi co the lay qua
     * class resource de ap dung kiem tra quyen giao vien chu lop/hoc sinh trong lop;
     * khong mo rong quyen doc thu vien ca nhan goc.
     */
    public record LibraryContentDetail(
            UUID id,
            LibraryContentType type,
            String title,
            Subject subject,
            JsonNode payload,
            String thumbnailUrl
    ) {
    }
}
