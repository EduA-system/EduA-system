package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.library.HubContentReport;
import com.edua.beeduasystem.infrastructure.persistence.entity.HubContentReportEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.HubContentReportJpaRepository;
import com.edua.beeduasystem.repository.repositories.HubContentReportRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Repository
public class JpaHubContentReportRepository implements HubContentReportRepository {

    private final HubContentReportJpaRepository jpa;

    public JpaHubContentReportRepository(HubContentReportJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public HubContentReport save(HubContentReport report) {
        HubContentReportEntity e = jpa.findById(report.id()).orElseGet(HubContentReportEntity::new);
        e.setId(report.id());
        e.setLibraryContentId(report.libraryContentId());
        e.setReporterId(report.reporterId());
        e.setReason(report.reason());
        e.setCreatedAt(report.createdAt() != null ? report.createdAt() : Instant.now());
        HubContentReportEntity saved = jpa.save(e);
        return new HubContentReport(saved.getId(), saved.getLibraryContentId(), saved.getReporterId(),
                saved.getReason(), saved.getCreatedAt());
    }
}
