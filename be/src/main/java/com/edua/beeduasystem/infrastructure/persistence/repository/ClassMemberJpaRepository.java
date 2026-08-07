package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.domain.model.classroom.ClassMemberStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassMemberJpaRepository extends JpaRepository<ClassMemberEntity, UUID> {

    long countByClassIdAndStatus(UUID classId, ClassMemberStatus status);

    boolean existsByClassIdAndStudentIdAndStatus(UUID classId, UUID studentId, ClassMemberStatus status);

    Page<ClassMemberEntity> findByClassIdAndStatusOrderByJoinedAtDesc(UUID classId, ClassMemberStatus status, Pageable pageable);

    @Query("select m.studentId from ClassMemberEntity m where m.classId = :classId and m.status = :status")
    List<UUID> findStudentIdsByClassIdAndStatus(@Param("classId") UUID classId, @Param("status") ClassMemberStatus status);

    Optional<ClassMemberEntity> findByClassIdAndStudentId(UUID classId, UUID studentId);
}
