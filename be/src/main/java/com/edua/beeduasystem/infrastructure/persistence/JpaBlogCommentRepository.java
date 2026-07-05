package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.infrastructure.persistence.entity.BlogCommentEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.BlogCommentJpaRepository;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaBlogCommentRepository implements BlogCommentRepository {

    private final BlogCommentJpaRepository jpa;

    public JpaBlogCommentRepository(BlogCommentJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public BlogComment save(BlogComment comment) {
        BlogCommentEntity e = jpa.findById(comment.id()).orElseGet(BlogCommentEntity::new);
        e.setId(comment.id());
        e.setPostId(comment.postId());
        e.setAuthorId(comment.authorId());
        e.setContent(comment.content());
        e.setCreatedAt(comment.createdAt() != null ? comment.createdAt() : Instant.now());
        e.setUpdatedAt(comment.updatedAt() != null ? comment.updatedAt() : Instant.now());
        return toDomain(jpa.save(e));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BlogComment> findById(UUID id) {
        return jpa.findById(id).map(JpaBlogCommentRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlogComment> findByPostId(UUID postId) {
        return jpa.findByPostIdOrderByCreatedAtAsc(postId).stream().map(JpaBlogCommentRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countByPostId(UUID postId) {
        return jpa.countByPostId(postId);
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        jpa.deleteById(id);
    }

    private static BlogComment toDomain(BlogCommentEntity e) {
        return new BlogComment(
                e.getId(),
                e.getPostId(),
                e.getAuthorId(),
                e.getContent(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
