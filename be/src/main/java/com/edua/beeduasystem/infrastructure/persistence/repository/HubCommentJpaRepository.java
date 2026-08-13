package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.HubCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface HubCommentJpaRepository extends JpaRepository<HubCommentEntity, UUID> {

    List<HubCommentEntity> findByLibraryContentIdAndHiddenAtIsNullOrderByCreatedAtAsc(UUID libraryContentId);

    long countByLibraryContentIdAndHiddenAtIsNull(UUID libraryContentId);

    @Query("""
            SELECT c.libraryContentId, COUNT(c.id)
            FROM HubCommentEntity c
            WHERE c.hiddenAt IS NULL AND c.libraryContentId IN :libraryContentIds
            GROUP BY c.libraryContentId
            """)
    List<Object[]> countVisibleByLibraryContentIdsRaw(@Param("libraryContentIds") List<UUID> libraryContentIds);
}
