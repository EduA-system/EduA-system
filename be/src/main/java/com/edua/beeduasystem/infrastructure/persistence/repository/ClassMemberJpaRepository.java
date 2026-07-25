package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClassMemberJpaRepository extends JpaRepository<ClassMemberEntity, UUID> {

    long countByClassId(UUID classId);

    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);

    Page<ClassMemberEntity> findByClassIdOrderByJoinedAtDesc(UUID classId, Pageable pageable);
}
