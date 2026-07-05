package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.BlogPostEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.BlogPostJpaRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaBlogPostRepository implements BlogPostRepository {

    private final BlogPostJpaRepository jpa;

    public JpaBlogPostRepository(BlogPostJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public BlogPost save(BlogPost post) {
        BlogPostEntity e = jpa.findById(post.id()).orElseGet(BlogPostEntity::new);
        e.setId(post.id());
        e.setAuthorId(post.authorId());
        e.setTitle(post.title());
        e.setContent(post.content());
        e.setSubject(post.subject());
        e.setStatus(post.status());
        e.setRemovedReason(post.removedReason());
        e.setRemovedBy(post.removedBy());
        e.setCreatedAt(post.createdAt() != null ? post.createdAt() : Instant.now());
        e.setUpdatedAt(post.updatedAt() != null ? post.updatedAt() : Instant.now());
        return toDomain(jpa.save(e));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BlogPost> findById(UUID id) {
        return jpa.findById(id).map(JpaBlogPostRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BlogPost> findPublishedById(UUID id) {
        return jpa.findByIdAndStatus(id, BlogPostStatus.PUBLISHED).map(JpaBlogPostRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResult search(Subject subject, UUID authorId, String q, int page, int size) {
        Specification<BlogPostEntity> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), BlogPostStatus.PUBLISHED));
            if (subject != null) {
                predicates.add(cb.equal(root.get("subject"), subject));
            }
            if (authorId != null) {
                predicates.add(cb.equal(root.get("authorId"), authorId));
            }
            if (q != null && !q.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = jpa.findAll(spec, pageable);
        List<BlogPost> items = result.getContent().stream().map(JpaBlogPostRepository::toDomain).toList();
        return new SearchResult(items, result.getTotalElements());
    }

    private static BlogPost toDomain(BlogPostEntity e) {
        return new BlogPost(
                e.getId(),
                e.getAuthorId(),
                e.getTitle(),
                e.getContent(),
                e.getSubject(),
                e.getStatus(),
                e.getRemovedReason(),
                e.getRemovedBy(),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
