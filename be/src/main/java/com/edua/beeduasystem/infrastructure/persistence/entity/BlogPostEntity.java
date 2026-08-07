package com.edua.beeduasystem.infrastructure.persistence.entity;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
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
@Table(name = "blog_posts")
@Getter
@Setter
@NoArgsConstructor
public class BlogPostEntity {

    @Id
    private UUID id;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "thumbnail_url", length = 1000)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BlogPostStatus status;

    @Column(name = "removed_reason", columnDefinition = "TEXT")
    private String removedReason;

    @Column(name = "removed_by")
    private UUID removedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
