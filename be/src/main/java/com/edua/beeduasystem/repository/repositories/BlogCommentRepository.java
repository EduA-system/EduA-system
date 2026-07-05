package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.blog.BlogComment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Truy cập bình luận blog. Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}. */
public interface BlogCommentRepository {

    BlogComment save(BlogComment comment);

    Optional<BlogComment> findById(UUID id);

    /** Bình luận của một bài, sắp theo thời gian tăng dần. */
    List<BlogComment> findByPostId(UUID postId);

    long countByPostId(UUID postId);

    void deleteById(UUID id);
}
