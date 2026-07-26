package com.edua.beeduasystem.infrastructure.persistence.entity;

import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "class_resources")
@Getter
@Setter
@NoArgsConstructor
public class ClassResourceEntity {

    @Id
    private UUID id;

    @Column(name = "class_id", nullable = false)
    private UUID classId;

    @Column(name = "posted_by", nullable = false)
    private UUID postedBy;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private ResourceSourceType sourceType;

    @Column(name = "source_library_content_id")
    private UUID sourceLibraryContentId;

    @Column(name = "thumbnail_url", columnDefinition = "TEXT")
    private String thumbnailUrl;

    @Column(name = "attachment_file_id")
    private String attachmentFileId;

    @Column(name = "attachment_url", columnDefinition = "TEXT")
    private String attachmentUrl;

    @Column(name = "attachment_file_name")
    private String attachmentFileName;

    @Column(name = "attachment_content_type")
    private String attachmentContentType;

    @Column(name = "attachment_size_bytes")
    private Long attachmentSizeBytes;

    @Column(name = "submission_enabled", nullable = false)
    private boolean submissionEnabled;

    @Column
    private Instant deadline;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
