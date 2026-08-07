package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.library.HubComment;
import com.edua.beeduasystem.infrastructure.persistence.entity.HubCommentEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.HubCommentJpaRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
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
        e.setContent(comment.content());
        e.setCreatedAt(comment.createdAt() != null ? comment.createdAt() : Instant.now());
        e.setUpdatedAt(comment.updatedAt() != null ? comment.updatedAt() : Instant.now());
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
        return jpa.findByLibraryContentIdOrderByCreatedAtAsc(libraryContentId).stream()
                .map(JpaHubCommentRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countByLibraryContentId(UUID libraryContentId) {
        return jpa.countByLibraryContentId(libraryContentId);
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
                e.getContent(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
