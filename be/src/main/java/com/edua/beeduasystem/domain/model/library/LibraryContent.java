package com.edua.beeduasystem.domain.model.library;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record LibraryContent(UUID id, UUID ownerId, LibraryContentType type, String title, Subject subject,
                             Integer grade, String textbookCode, String chapterCode, LibraryContentStatus status,
                             JsonNode payload, String thumbnailUrl,
                             Instant createdAt, Instant updatedAt, Instant submittedAt, Instant deletedAt,
                             UUID reviewedBy, Instant reviewedAt, String rejectionReason, Long version,
                             UUID sourceLibraryContentId) {
    public LibraryContent(UUID id, UUID ownerId, LibraryContentType type, String title, Subject subject,
                          Integer grade, String textbookCode, String chapterCode, LibraryContentStatus status,
                          JsonNode payload, String thumbnailUrl,
                          Instant createdAt, Instant updatedAt, Instant submittedAt, Instant deletedAt,
                          UUID reviewedBy, Instant reviewedAt, String rejectionReason, Long version) {
        this(id, ownerId, type, title, subject, grade, textbookCode, chapterCode, status, payload, thumbnailUrl,
                createdAt, updatedAt, submittedAt, deletedAt, reviewedBy, reviewedAt, rejectionReason, version, null);
    }
    public LibraryContent(UUID id, UUID ownerId, LibraryContentType type, String title, Subject subject,
                          Integer grade, String textbookCode, String chapterCode, LibraryContentStatus status,
                          JsonNode payload, String thumbnailUrl,
                          Instant createdAt, Instant updatedAt, Instant submittedAt, Instant deletedAt,
                          UUID reviewedBy, Instant reviewedAt, String rejectionReason) {
        this(id, ownerId, type, title, subject, grade, textbookCode, chapterCode, status, payload, thumbnailUrl,
                createdAt, updatedAt, submittedAt, deletedAt, reviewedBy, reviewedAt, rejectionReason, null, null);
    }

    public LibraryContent(UUID id, UUID ownerId, LibraryContentType type, String title, Subject subject,
                          LibraryContentStatus status, JsonNode payload, String thumbnailUrl,
                          Instant createdAt, Instant updatedAt, Instant submittedAt, Instant deletedAt,
                          UUID reviewedBy, Instant reviewedAt, String rejectionReason) {
        this(id, ownerId, type, title, subject, null, null, null, status, payload, thumbnailUrl,
                createdAt, updatedAt, submittedAt, deletedAt, reviewedBy, reviewedAt, rejectionReason, null, null);
    }
}
