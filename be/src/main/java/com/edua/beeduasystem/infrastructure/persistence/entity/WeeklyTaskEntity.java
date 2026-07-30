package com.edua.beeduasystem.infrastructure.persistence.entity;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import com.fasterxml.jackson.databind.JsonNode;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity @Table(name = "weekly_tasks") @Getter @Setter @NoArgsConstructor
public class WeeklyTaskEntity {
    @Id private UUID id;
    @Column(name = "moderator_id", nullable = false) private UUID moderatorId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Subject subject;
    @Column(name = "teacher_id", nullable = false) private UUID teacherId;
    @Column(name = "week_start_date", nullable = false) private LocalDate weekStartDate;
    @Column(name = "scope_description", nullable = false, columnDefinition = "TEXT") private String scopeDescription;
    @Column(nullable = false) private Instant deadline;
    @Enumerated(EnumType.STRING) @Column(name = "review_status", nullable = false, length = 20) private WeeklyTaskReviewStatus reviewStatus;
    @Column(name = "source_library_content_id") private UUID sourceLibraryContentId;
    @Column(name = "source_library_content_title") private String sourceLibraryContentTitle;
    @JdbcTypeCode(SqlTypes.JSON) @Column(name = "source_library_content_payload", columnDefinition = "jsonb") private JsonNode sourceLibraryContentPayload;
    @Column(name = "source_document_url", columnDefinition = "TEXT") private String sourceDocumentUrl;
    @Column(name = "source_document_name", columnDefinition = "TEXT") private String sourceDocumentName;
    @Column(name = "submitted_at") private Instant submittedAt;
    @Column(name = "reviewed_by") private UUID reviewedBy;
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "rejection_reason", columnDefinition = "TEXT") private String rejectionReason;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Version private Long version;
}
