package com.edua.beeduasystem.infrastructure.persistence.entity;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "library_contents") @Getter @Setter @NoArgsConstructor
public class LibraryContentEntity {
    @Id private UUID id;
    @Column(name = "owner_id", nullable = false) private UUID ownerId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private LibraryContentType type;
    @Column(nullable = false) private String title;
    @Enumerated(EnumType.STRING) private Subject subject;
    private Integer grade;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private LibraryContentStatus status;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private JsonNode payload;
    @Column(name = "thumbnail_url", columnDefinition = "TEXT") private String thumbnailUrl;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;
}
