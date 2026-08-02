package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.classroom.ClassResource;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassResourceEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ClassResourceJpaRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaClassResourceRepository implements ClassResourceRepository {

    private final ClassResourceJpaRepository jpa;

    public JpaClassResourceRepository(ClassResourceJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult findByClassId(UUID classId, int page, int size) {
        Page<ClassResourceEntity> result = jpa.findByClassIdOrderByCreatedAtDesc(classId, PageRequest.of(page, size));
        List<ClassResource> items = result.getContent().stream().map(JpaClassResourceRepository::toDomain).toList();
        return new PageResult(items, result.getTotalElements());
    }

    @Override
    @Transactional
    public ClassResource save(ClassResource resource) {
        ClassResourceEntity entity = jpa.findById(resource.id()).orElseGet(ClassResourceEntity::new);
        entity.setId(resource.id());
        entity.setClassId(resource.classId());
        entity.setPostedBy(resource.postedBy());
        entity.setTitle(resource.title());
        entity.setDescription(resource.description());
        entity.setSourceType(resource.sourceType());
        entity.setSourceLibraryContentId(resource.sourceLibraryContentId());
        entity.setThumbnailUrl(resource.thumbnailUrl());
        entity.setAttachmentFileId(resource.attachmentFileId());
        entity.setAttachmentUrl(resource.attachmentUrl());
        entity.setAttachmentFileName(resource.attachmentFileName());
        entity.setAttachmentContentType(resource.attachmentContentType());
        entity.setAttachmentSizeBytes(resource.attachmentSizeBytes());
        entity.setSubmissionEnabled(resource.submissionEnabled());
        entity.setDeadline(resource.deadline());
        entity.setCreatedAt(resource.createdAt() != null ? resource.createdAt() : Instant.now());
        entity.setUpdatedAt(resource.updatedAt() != null ? resource.updatedAt() : Instant.now());
        return toDomain(jpa.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ClassResource> findById(UUID id) {
        return jpa.findById(id).map(JpaClassResourceRepository::toDomain);
    }

    @Override
    @Transactional
    public void deleteById(UUID id) {
        jpa.deleteById(id);
    }

    private static ClassResource toDomain(ClassResourceEntity entity) {
        return new ClassResource(
                entity.getId(),
                entity.getClassId(),
                entity.getPostedBy(),
                entity.getTitle(),
                entity.getDescription(),
                entity.getSourceType(),
                entity.getSourceLibraryContentId(),
                entity.getThumbnailUrl(),
                entity.getAttachmentFileId(),
                entity.getAttachmentUrl(),
                entity.getAttachmentFileName(),
                entity.getAttachmentContentType(),
                entity.getAttachmentSizeBytes(),
                entity.isSubmissionEnabled(),
                entity.getDeadline(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
