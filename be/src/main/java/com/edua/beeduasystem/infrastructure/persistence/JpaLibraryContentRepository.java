package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.*;
import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.LibraryContentJpaRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
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
    private final EntityManager entityManager;

    public JpaLibraryContentRepository(LibraryContentJpaRepository jpa, EntityManager entityManager) {
        this.jpa = jpa;
        this.entityManager = entityManager;
    }
    @Override @Transactional public LibraryContent save(LibraryContent c) {
        LibraryContentEntity e = jpa.findById(c.id()).orElseGet(LibraryContentEntity::new);
        e.setId(c.id()); e.setOwnerId(c.ownerId()); e.setType(c.type()); e.setTitle(c.title()); e.setSubject(c.subject()); e.setGrade(c.grade());
        e.setTextbookCode(c.textbookCode()); e.setChapterCode(c.chapterCode());
        e.setStatus(c.status()); e.setPayload(c.payload()); e.setThumbnailUrl(c.thumbnailUrl()); e.setCreatedAt(c.createdAt()); e.setUpdatedAt(c.updatedAt()); e.setSubmittedAt(c.submittedAt()); e.setDeletedAt(c.deletedAt());
        e.setReviewedBy(c.reviewedBy()); e.setReviewedAt(c.reviewedAt()); e.setRejectionReason(c.rejectionReason());
        return toDomain(jpa.save(e));
    }
    @Override @Transactional(readOnly = true) public Optional<LibraryContent> findActiveById(UUID id) {
        return jpa.findById(id).filter(e -> e.getDeletedAt() == null).map(JpaLibraryContentRepository::toDomain);
    }
    @Override @Transactional(readOnly = true) public Optional<LibraryContent> findApprovedForHubById(UUID id) {
        return jpa.findById(id)
                .filter(e -> e.getStatus() == LibraryContentStatus.APPROVED)
                .map(JpaLibraryContentRepository::toDomain);
    }
    @Override @Transactional(readOnly = true) public SearchResult search(UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String textbookCode, String chapterCode, String q, int page, int size, boolean titleAscending) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("ownerId"), ownerId)); ps.add(cb.isNull(root.get("deletedAt")));
            if (type != null) ps.add(cb.equal(root.get("type"), type)); if (subject != null) ps.add(cb.equal(root.get("subject"), subject));
            if (grade != null) ps.add(cb.equal(root.get("grade"), grade));
            if (textbookCode != null) ps.add(cb.equal(root.get("textbookCode"), textbookCode));
            if (chapterCode != null) ps.add(cb.equal(root.get("chapterCode"), chapterCode));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%")); return cb.and(ps.toArray(Predicate[]::new)); };
        Sort sort = titleAscending ? Sort.by("title").ascending() : Sort.by("updatedAt").descending();
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), sort));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    @Override @Transactional(readOnly = true) public SearchResult searchApproved(LibraryContentType type, Subject subject, String q, int page, int size) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("status"), LibraryContentStatus.APPROVED));
            if (type != null) ps.add(cb.equal(root.get("type"), type)); if (subject != null) ps.add(cb.equal(root.get("subject"), subject));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%")); return cb.and(ps.toArray(Predicate[]::new)); };
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), Sort.by("updatedAt").descending()));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    @Override @Transactional(readOnly = true) public HubSearchResult searchApprovedHubSummaries(LibraryContentType type, Subject subject, String q, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        String where = approvedHubWhere(type, subject, q);
        String feedSql = """
                WITH page AS (
                    SELECT lc.id, lc.type, lc.title, lc.subject, lc.owner_id, lc.thumbnail_url, lc.reviewed_at, lc.updated_at
                    FROM library_contents lc
                """ + where + """
                    ORDER BY lc.updated_at DESC
                    LIMIT :limit OFFSET :offset
                )
                SELECT p.id, p.type, p.title, p.subject, p.owner_id,
                       COALESCE(NULLIF(BTRIM(u.full_name), ''), u.email) AS owner_name,
                       p.thumbnail_url, p.reviewed_at, COUNT(c.id) AS comment_count
                FROM page p
                LEFT JOIN app_users u ON u.id = p.owner_id
                LEFT JOIN hub_content_comments c ON c.library_content_id = p.id AND c.hidden_at IS NULL
                GROUP BY p.id, p.type, p.title, p.subject, p.owner_id, p.thumbnail_url, p.reviewed_at, p.updated_at, u.full_name, u.email
                ORDER BY p.updated_at DESC
                """;
        Query feedQuery = entityManager.createNativeQuery(feedSql);
        bindApprovedHubFilters(feedQuery, type, subject, q);
        feedQuery.setParameter("limit", safeSize);
        feedQuery.setParameter("offset", safePage * safeSize);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = feedQuery.getResultList();

        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(*) FROM library_contents lc" + where);
        bindApprovedHubFilters(countQuery, type, subject, q);
        long total = ((Number) countQuery.getSingleResult()).longValue();
        return new HubSearchResult(rows.stream().map(JpaLibraryContentRepository::toHubContentSummary).toList(), total);
    }
    @Override @Transactional(readOnly = true) public SearchResult searchByStatusAndSubject(LibraryContentStatus status, Subject subject, int page, int size) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("status"), status)); ps.add(cb.isNull(root.get("deletedAt")));
            if (subject != null) ps.add(cb.equal(root.get("subject"), subject)); else ps.add(cb.isNull(root.get("subject")));
            return cb.and(ps.toArray(Predicate[]::new)); };
        Page<LibraryContentEntity> result = jpa.findAll(spec, PageRequest.of(Math.max(0,page), Math.min(Math.max(1,size),100), Sort.by("submittedAt").ascending()));
        return new SearchResult(result.getContent().stream().map(JpaLibraryContentRepository::toDomain).toList(), result.getTotalElements());
    }
    @Override @Transactional(readOnly = true) public long countByStatusAndSubject(LibraryContentStatus status, Subject subject) {
        return jpa.countByStatusAndSubjectAndDeletedAtIsNull(status, subject);
    }
    @Override @Transactional(readOnly = true) public List<MonthTypeAggregate> countCreatedByMonthAndType(Instant fromInclusive, Instant toExclusive) {
        return jpa.countCreatedByMonthAndTypeRaw(fromInclusive, toExclusive).stream()
                .map(row -> new MonthTypeAggregate((String) row[0], LibraryContentType.valueOf((String) row[1]), ((Number) row[2]).longValue()))
                .toList();
    }
    @Override @Transactional(readOnly = true) public List<SubjectTypeAggregate> countBySubjectAndType() {
        return jpa.countBySubjectAndTypeRaw().stream()
                .map(row -> new SubjectTypeAggregate(Subject.valueOf((String) row[0]), LibraryContentType.valueOf((String) row[1]), ((Number) row[2]).longValue()))
                .toList();
    }
    @Override @Transactional(readOnly = true) public long countByStatus(LibraryContentStatus status) {
        return jpa.countByStatusAndDeletedAtIsNull(status);
    }
    private static String approvedHubWhere(LibraryContentType type, Subject subject, String q) {
        StringBuilder where = new StringBuilder(" WHERE lc.status = 'APPROVED'");
        if (type != null) where.append(" AND lc.type = :type");
        if (subject != null) where.append(" AND lc.subject = :subject");
        if (q != null && !q.isBlank()) where.append(" AND LOWER(lc.title) LIKE :q");
        return where.toString();
    }
    private static void bindApprovedHubFilters(Query query, LibraryContentType type, Subject subject, String q) {
        if (type != null) query.setParameter("type", type.name());
        if (subject != null) query.setParameter("subject", subject.name());
        if (q != null && !q.isBlank()) query.setParameter("q", "%" + q.trim().toLowerCase() + "%");
    }
    private static HubContentSummary toHubContentSummary(Object[] row) {
        return new HubContentSummary((UUID) row[0], LibraryContentType.valueOf(row[1].toString()), (String) row[2],
                row[3] == null ? null : Subject.valueOf(row[3].toString()), (UUID) row[4], (String) row[5],
                (String) row[6], toInstant(row[7]), ((Number) row[8]).longValue());
    }
    private static Instant toInstant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof java.time.OffsetDateTime offsetDateTime) return offsetDateTime.toInstant();
        if (value instanceof java.sql.Timestamp timestamp) return timestamp.toInstant();
        throw new IllegalArgumentException("Unsupported timestamp value from Community Hub projection: " + value.getClass());
    }
    private static LibraryContent toDomain(LibraryContentEntity e) { return new LibraryContent(e.getId(),e.getOwnerId(),e.getType(),e.getTitle(),e.getSubject(),e.getGrade(),e.getTextbookCode(),e.getChapterCode(),e.getStatus(),e.getPayload(),e.getThumbnailUrl(),e.getCreatedAt(),e.getUpdatedAt(),e.getSubmittedAt(),e.getDeletedAt(),e.getReviewedBy(),e.getReviewedAt(),e.getRejectionReason(),e.getVersion()); }
}
