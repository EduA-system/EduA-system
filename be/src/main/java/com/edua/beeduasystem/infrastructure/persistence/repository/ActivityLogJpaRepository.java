package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.ActivityLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface ActivityLogJpaRepository
        extends JpaRepository<ActivityLogEntity, UUID>, JpaSpecificationExecutor<ActivityLogEntity> {
}
