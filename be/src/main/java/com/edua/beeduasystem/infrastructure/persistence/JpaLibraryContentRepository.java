package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.*;
import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.LibraryContentJpaRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.*;

@Repository
public class JpaLibraryContentRepository implements LibraryContentRepository {
    private final LibraryContentJpaRepository jpa;
    public JpaLibraryContentRepository(LibraryContentJpaRepository jpa) { this.jpa = jpa; }
    @Override @Transactional public LibraryContent save(LibraryContent c) {
        LibraryContentEntity e = jpa.findById(c.id()).orElseGet(LibraryContentEntity::new);
        e.setId(c.id()); e.setOwnerId(c.ownerId()); e.setType(c.type()); e.setTitle(c.title()); e.setSubject(c.subject());
        e.setStatus(c.status()); e.setPayload(c.payload()); e.setThumbnailUrl(c.thumbnailUrl()); e.setCreatedAt(c.createdAt()); e.setUpdatedAt(c.updatedAt()); e.setSubmittedAt(c.submittedAt()); e.setDeletedAt(c.deletedAt());
        e.setReviewedBy(c.reviewedBy()); e.setReviewedAt(c.reviewedAt()); e.setRejectionReason(c.rejectionReason());
        return toDomain(jpa.save(e));
    }
    @Override @Transactional(readOnly = true) public Optional<LibraryContent> findActiveById(UUID id) {
        return jpa.findById(id).filter(e -> e.getDeletedAt() == null).map(JpaLibraryContentRepository::toDomain);
    }
    @Override @Transactional(readOnly = true) public SearchResult search(UUID ownerId, LibraryContentType type, Subject subject, String q, int page, int size, boolean titleAscending) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("ownerId"), ownerId)); ps.add(cb.isNull(root.get("deletedAt")));
            if (type != null) ps.add(cb.equal(root.get("type"), type)); if (subject != null) ps.add(cb.equal(root.get("subject"), subject));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%")); return cb.and(ps.toArray(Predicate[]::new)); };
        Sort sort = titleAscending ? Sort.by("title").ascending() : Sort.by("updatedAt").descending();
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), sort));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    @Override @Transactional(readOnly = true) public SearchResult searchApproved(LibraryContentType type, Subject subject, String q, int page, int size) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("status"), LibraryContentStatus.APPROVED)); ps.add(cb.isNull(root.get("deletedAt")));
            if (type != null) ps.add(cb.equal(root.get("type"), type)); if (subject != null) ps.add(cb.equal(root.get("subject"), subject));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%")); return cb.and(ps.toArray(Predicate[]::new)); };
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), Sort.by("updatedAt").descending()));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    @Override @Transactional(readOnly = true) public SearchResult searchByStatusAndSubject(LibraryContentStatus status, Subject subject, int page, int size) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("status"), status)); ps.add(cb.isNull(root.get("deletedAt")));
            if (subject != null) ps.add(cb.equal(root.get("subject"), subject)); else ps.add(cb.isNull(root.get("subject")));
            return cb.and(ps.toArray(Predicate[]::new)); };
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), Sort.by("submittedAt").ascending()));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    private static LibraryContent toDomain(LibraryContentEntity e) { return new LibraryContent(e.getId(),e.getOwnerId(),e.getType(),e.getTitle(),e.getSubject(),e.getStatus(),e.getPayload(),e.getThumbnailUrl(),e.getCreatedAt(),e.getUpdatedAt(),e.getSubmittedAt(),e.getDeletedAt(),e.getReviewedBy(),e.getReviewedAt(),e.getRejectionReason()); }
}
