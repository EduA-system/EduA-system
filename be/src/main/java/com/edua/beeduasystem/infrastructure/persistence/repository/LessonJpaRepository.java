package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.LessonEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LessonJpaRepository extends JpaRepository<LessonEntity, UUID> {

    @Query("""
            SELECT l.knowledgeJson FROM LessonEntity l
            WHERE l.code = :lessonCode
              AND l.chapter.code = :chapterCode
              AND l.chapter.textbook.code = :bookCode
            """)
    Optional<String> findKnowledge(@Param("bookCode") String bookCode,
                                   @Param("chapterCode") String chapterCode,
                                   @Param("lessonCode") String lessonCode);
}
