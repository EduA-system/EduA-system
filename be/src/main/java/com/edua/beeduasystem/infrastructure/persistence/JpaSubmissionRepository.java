package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.classroom.Submission;
import com.edua.beeduasystem.domain.model.classroom.SubmissionFile;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.SubmissionEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.SubmissionFileEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.SubmissionFileJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.SubmissionJpaRepository;
import com.edua.beeduasystem.repository.repositories.SubmissionRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class JpaSubmissionRepository implements SubmissionRepository {

    private final SubmissionJpaRepository submissionJpa;
    private final SubmissionFileJpaRepository fileJpa;

    public JpaSubmissionRepository(SubmissionJpaRepository submissionJpa, SubmissionFileJpaRepository fileJpa) {
        this.submissionJpa = submissionJpa;
        this.fileJpa = fileJpa;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<SubmissionWithFiles> findByResourceAndStudent(UUID classResourceId, UUID studentId) {
        return submissionJpa.findByClassResourceIdAndStudentId(classResourceId, studentId)
                .map(entity -> new SubmissionWithFiles(toDomain(entity), toFiles(entity.getId())));
    }

    @Override
    @Transactional
    public SubmissionWithFiles upsert(Submission submission, List<SubmissionFile> files) {
        SubmissionEntity entity = submissionJpa
                .findByClassResourceIdAndStudentId(submission.classResourceId(), submission.studentId())
                .orElseGet(SubmissionEntity::new);
        UUID id = entity.getId() != null ? entity.getId() : submission.id();
        Instant createdAt = entity.getCreatedAt() != null ? entity.getCreatedAt() : submission.createdAt();

        entity.setId(id);
        entity.setClassResourceId(submission.classResourceId());
        entity.setStudentId(submission.studentId());
        entity.setTextContent(submission.textContent());
        entity.setStatus(submission.status());
        entity.setSubmittedAt(submission.submittedAt());
        entity.setCreatedAt(createdAt);
        entity.setUpdatedAt(Instant.now());
        SubmissionEntity saved = submissionJpa.save(entity);

        // Thay the toan bo file cu bang file moi (BR-36: khong version history).
        fileJpa.deleteBySubmissionId(saved.getId());
        List<SubmissionFileEntity> fileEntities = files.stream().map(file -> {
            SubmissionFileEntity fileEntity = new SubmissionFileEntity();
            fileEntity.setId(UUID.randomUUID());
            fileEntity.setSubmissionId(saved.getId());
            fileEntity.setUrl(file.url());
            fileEntity.setFileName(file.fileName());
            fileEntity.setContentType(file.contentType());
            fileEntity.setSizeBytes(file.sizeBytes());
            return fileEntity;
        }).toList();
        List<SubmissionFileEntity> savedFiles = fileJpa.saveAll(fileEntities);

        return new SubmissionWithFiles(toDomain(saved), savedFiles.stream().map(JpaSubmissionRepository::toFileDomain).toList());
    }

    @Override
    @Transactional
    public void deleteByResourceAndStudent(UUID classResourceId, UUID studentId) {
        submissionJpa.findByClassResourceIdAndStudentId(classResourceId, studentId).ifPresent(entity -> {
            fileJpa.deleteBySubmissionId(entity.getId());
            submissionJpa.deleteById(entity.getId());
        });
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, SubmissionStatus> findStatusesByResourceIds(List<UUID> classResourceIds, UUID studentId) {
        if (classResourceIds.isEmpty()) {
            return Map.of();
        }
        return submissionJpa.findByClassResourceIdInAndStudentId(classResourceIds, studentId).stream()
                .collect(Collectors.toMap(SubmissionEntity::getClassResourceId, SubmissionEntity::getStatus));
    }

    private List<SubmissionFile> toFiles(UUID submissionId) {
        return fileJpa.findBySubmissionId(submissionId).stream().map(JpaSubmissionRepository::toFileDomain).toList();
    }

    private static Submission toDomain(SubmissionEntity entity) {
        return new Submission(
                entity.getId(),
                entity.getClassResourceId(),
                entity.getStudentId(),
                entity.getTextContent(),
                entity.getStatus(),
                entity.getSubmittedAt(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private static SubmissionFile toFileDomain(SubmissionFileEntity entity) {
        return new SubmissionFile(
                entity.getId(),
                entity.getSubmissionId(),
                entity.getUrl(),
                entity.getFileName(),
                entity.getContentType(),
                entity.getSizeBytes());
    }
}
