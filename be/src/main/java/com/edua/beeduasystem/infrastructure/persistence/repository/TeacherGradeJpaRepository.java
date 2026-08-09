package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.TeacherGradeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeacherGradeJpaRepository
        extends JpaRepository<TeacherGradeEntity, TeacherGradeEntity.TeacherGradeId> {

    List<TeacherGradeEntity> findByUserId(UUID userId);

    List<TeacherGradeEntity> findByUserIdIn(List<UUID> userIds);
}
