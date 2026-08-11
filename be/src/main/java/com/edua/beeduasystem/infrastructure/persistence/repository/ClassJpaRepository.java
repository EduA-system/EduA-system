package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ClassJpaRepository extends JpaRepository<ClassEntity, UUID>, JpaSpecificationExecutor<ClassEntity> {

    @Modifying
    @Query("UPDATE ClassEntity c SET c.status = :archivedStatus, c.updatedAt = CURRENT_TIMESTAMP WHERE c.ownerId = :ownerId AND c.status = :activeStatus")
    int archiveActiveByOwnerId(
            @Param("ownerId") UUID ownerId,
            @Param("archivedStatus") ClassStatus archivedStatus,
            @Param("activeStatus") ClassStatus activeStatus);
}
