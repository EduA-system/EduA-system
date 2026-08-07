package com.edua.beeduasystem.infrastructure.persistence.entity;

import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
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
@Table(name = "submissions")
@Getter
@Setter
@NoArgsConstructor
public class SubmissionEntity {

    @Id
    private UUID id;

    @Column(name = "class_resource_id", nullable = false)
    private UUID classResourceId;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "text_content", columnDefinition = "TEXT")
    private String textContent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubmissionStatus status;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
