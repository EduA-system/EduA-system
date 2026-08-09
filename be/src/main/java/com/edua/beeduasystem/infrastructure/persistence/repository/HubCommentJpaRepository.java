package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.HubCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HubCommentJpaRepository extends JpaRepository<HubCommentEntity, UUID> {

    List<HubCommentEntity> findByLibraryContentIdAndHiddenAtIsNullOrderByCreatedAtAsc(UUID libraryContentId);

    long countByLibraryContentIdAndHiddenAtIsNull(UUID libraryContentId);
}
