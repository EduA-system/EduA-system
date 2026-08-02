package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.HubContentReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface HubContentReportJpaRepository extends JpaRepository<HubContentReportEntity, UUID> {
}
