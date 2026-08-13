package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.library.HubComment;
import com.edua.beeduasystem.infrastructure.persistence.entity.HubCommentEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.HubCommentJpaRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaHubCommentRepository implements HubCommentRepository {

    private final HubCommentJpaRepository jpa;

    public JpaHubCommentRepository(HubCommentJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public HubComment save(HubComment comment) {
        HubCommentEntity e = jpa.findById(comment.id()).orElseGet(HubCommentEntity::new);
        e.setId(comment.id());
        e.setLibraryContentId(comment.libraryContentId());
        e.setAuthorId(comment.authorId());
        e.setParentCommentId(comment.parentCommentId());
        e.setContent(comment.content());
        e.setCreatedAt(comment.createdAt() != null ? comment.createdAt() : Instant.now());
        e.setUpdatedAt(comment.updatedAt() != null ? comment.updatedAt() : Instant.now());
        e.setHiddenAt(comment.hiddenAt());
        e.setHiddenBy(comment.hiddenBy());
        return toDomain(jpa.save(e));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<HubComment> findById(UUID id) {
        return jpa.findById(id).map(JpaHubCommentRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HubComment> findByLibraryContentId(UUID libraryContentId) {
        return jpa.findByLibraryContentIdAndHiddenAtIsNullOrderByCreatedAtAsc(libraryContentId).stream()
                .map(JpaHubCommentRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countByLibraryContentId(UUID libraryContentId) {
        return jpa.countByLibraryContentIdAndHiddenAtIsNull(libraryContentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentCount> countVisibleByLibraryContentIds(Collection<UUID> libraryContentIds) {
        if (libraryContentIds == null || libraryContentIds.isEmpty()) {
            return List.of();
        }
        return jpa.countVisibleByLibraryContentIdsRaw(List.copyOf(libraryContentIds)).stream()
                .map(row -> new CommentCount((UUID) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        jpa.deleteById(id);
    }

    private static HubComment toDomain(HubCommentEntity e) {
        return new HubComment(
                e.getId(),
                e.getLibraryContentId(),
                e.getAuthorId(),
                e.getParentCommentId(),
                e.getContent(),
                e.getCreatedAt(),
                e.getUpdatedAt(),
                e.getHiddenAt(),
                e.getHiddenBy());
    }
}
