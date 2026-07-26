package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.classroom.ClassResource;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassResourceEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ClassResourceJpaRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
