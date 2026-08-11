package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.SubmissionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionJpaRepository extends JpaRepository<SubmissionEntity, UUID> {

    Optional<SubmissionEntity> findByClassResourceIdAndStudentId(UUID classResourceId, UUID studentId);

    List<SubmissionEntity> findByClassResourceIdInAndStudentId(List<UUID> classResourceIds, UUID studentId);

    void deleteByClassResourceIdAndStudentId(UUID classResourceId, UUID studentId);

    List<SubmissionEntity> findByClassResourceId(UUID classResourceId);

    @Query("""
            SELECT COUNT(s) FROM SubmissionEntity s
            JOIN ClassResourceEntity r ON r.id = s.classResourceId
            WHERE r.classId = :classId
            """)
    long countByClassId(@Param("classId") UUID classId);
}
