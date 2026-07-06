package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.BlogPostEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface BlogPostJpaRepository
        extends JpaRepository<BlogPostEntity, UUID>, JpaSpecificationExecutor<BlogPostEntity> {

    Optional<BlogPostEntity> findByIdAndStatus(UUID id, BlogPostStatus status);
}
