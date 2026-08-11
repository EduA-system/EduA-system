package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassMemberStatus;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ClassJpaRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class JpaClassRepository implements ClassRepository {

    private final ClassJpaRepository jpa;

    public JpaClassRepository(ClassJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public Classroom save(Classroom classroom) {
        ClassEntity entity = jpa.findById(classroom.id()).orElseGet(ClassEntity::new);
        entity.setId(classroom.id());
        entity.setOwnerId(classroom.ownerId());
        entity.setName(classroom.name());
        entity.setDescription(classroom.description());
        entity.setSubject(classroom.subject());
        entity.setGrade(classroom.grade());
        entity.setStatus(classroom.status());
        entity.setCreatedAt(classroom.createdAt() != null ? classroom.createdAt() : Instant.now());
        entity.setUpdatedAt(classroom.updatedAt() != null ? classroom.updatedAt() : Instant.now());
        return toDomain(jpa.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Classroom> findById(UUID id) {
        return jpa.findById(id).map(JpaClassRepository::toDomain);
    }

    @Override
    @Transactional
    public int archiveActiveByOwnerId(UUID ownerId) {
        return jpa.archiveActiveByOwnerId(ownerId, ClassStatus.INACTIVE, ClassStatus.ACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResult searchOwned(UUID ownerId, Subject subject, Integer grade, ClassStatus status, String q, int page, int size) {
        Specification<ClassEntity> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("ownerId"), ownerId));
            if (subject != null) {
                predicates.add(cb.equal(root.get("subject"), subject));
            }
            if (grade != null) {
                predicates.add(cb.equal(root.get("grade"), grade));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                String term = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("description")), term)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        var result = jpa.findAll(spec, pageable);
        List<Classroom> items = result.getContent().stream().map(JpaClassRepository::toDomain).toList();
        return new SearchResult(items, result.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResult searchEnrolled(UUID studentId, Subject subject, Integer grade, ClassStatus status, String q, int page, int size) {
        Specification<ClassEntity> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Subquery<UUID> enrolledClassIds = cq.subquery(UUID.class);
            var memberRoot = enrolledClassIds.from(ClassMemberEntity.class);
            enrolledClassIds.select(memberRoot.get("classId")).where(
                    cb.equal(memberRoot.get("studentId"), studentId),
                    cb.equal(memberRoot.get("status"), ClassMemberStatus.ENROLLED));
            predicates.add(root.get("id").in(enrolledClassIds));
            if (subject != null) {
                predicates.add(cb.equal(root.get("subject"), subject));
            }
            if (grade != null) {
                predicates.add(cb.equal(root.get("grade"), grade));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                String term = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), term),
                        cb.like(cb.lower(root.get("description")), term)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        var result = jpa.findAll(spec, pageable);
        List<Classroom> items = result.getContent().stream().map(JpaClassRepository::toDomain).toList();
        return new SearchResult(items, result.getTotalElements());
    }

    private static Classroom toDomain(ClassEntity entity) {
        return new Classroom(
                entity.getId(),
                entity.getOwnerId(),
                entity.getName(),
                entity.getDescription(),
                entity.getSubject(),
                entity.getGrade(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
