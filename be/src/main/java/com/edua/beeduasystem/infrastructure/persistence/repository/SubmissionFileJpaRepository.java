package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.SubmissionFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SubmissionFileJpaRepository extends JpaRepository<SubmissionFileEntity, UUID> {

    List<SubmissionFileEntity> findBySubmissionId(UUID submissionId);

    void deleteBySubmissionId(UUID submissionId);
}
