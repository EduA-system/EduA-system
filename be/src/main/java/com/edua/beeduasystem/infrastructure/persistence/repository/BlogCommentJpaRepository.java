package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.BlogCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BlogCommentJpaRepository extends JpaRepository<BlogCommentEntity, UUID> {

    List<BlogCommentEntity> findByPostIdAndHiddenAtIsNullOrderByCreatedAtAsc(UUID postId);

    long countByPostIdAndHiddenAtIsNull(UUID postId);

    @Query("SELECT c.postId AS postId, COUNT(c) AS commentCount "
            + "FROM BlogCommentEntity c WHERE c.postId IN :postIds AND c.hiddenAt IS NULL GROUP BY c.postId")
    List<CommentCountProjection> countVisibleByPostIdIn(@Param("postIds") List<UUID> postIds);

    interface CommentCountProjection {
        UUID getPostId();

        long getCommentCount();
    }
}
