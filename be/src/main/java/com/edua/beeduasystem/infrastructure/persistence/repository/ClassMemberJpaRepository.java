package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ClassMemberJpaRepository extends JpaRepository<ClassMemberEntity, UUID> {

    long countByClassId(UUID classId);

    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);

    Page<ClassMemberEntity> findByClassIdOrderByJoinedAtDesc(UUID classId, Pageable pageable);

    @Query("select m.studentId from ClassMemberEntity m where m.classId = :classId")
    List<UUID> findStudentIdsByClassId(UUID classId);

    void deleteByClassIdAndStudentId(UUID classId, UUID studentId);

    void deleteByStudentId(UUID studentId);
}
