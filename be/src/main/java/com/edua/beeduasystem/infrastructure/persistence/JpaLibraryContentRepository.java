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
        e.setReviewedBy(c.reviewedBy()); e.setReviewedAt(c.reviewedAt()); e.setRejectionReason(c.rejectionReason()); e.setSourceLibraryContentId(c.sourceLibraryContentId());
        return toDomain(jpa.save(e));
    }
    @Override @Transactional(readOnly = true) public Optional<LibraryContent> findActiveById(UUID id) {
        return jpa.findById(id).filter(e -> e.getDeletedAt() == null).map(JpaLibraryContentRepository::toDomain);
    }
    @Override @Transactional(readOnly = true) public List<LibraryContent> findActiveSnapshotsBySourceId(UUID sourceLibraryContentId) {
        return jpa.findBySourceLibraryContentIdAndDeletedAtIsNull(sourceLibraryContentId).stream()
                .map(JpaLibraryContentRepository::toDomain)
                .toList();
    }
    @Override @Transactional(readOnly = true) public boolean hasAnySnapshotBySourceId(UUID sourceLibraryContentId) {
        return jpa.existsBySourceLibraryContentId(sourceLibraryContentId);
    }
    @Override @Transactional(readOnly = true) public Optional<LibraryContent> findApprovedForHubById(UUID id) {
        return jpa.findById(id)
                .filter(e -> e.getStatus() == LibraryContentStatus.APPROVED)
                .filter(e -> e.getDeletedAt() == null)
                .filter(e -> e.getSourceLibraryContentId() != null || !jpa.existsBySourceLibraryContentId(e.getId()))
                .map(JpaLibraryContentRepository::toDomain);
    }
    @Override @Transactional(readOnly = true) public SummarySearchResult searchSummaries(UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String textbookCode, String chapterCode, String q, int page, int size, boolean titleAscending) {
        return searchSummaries(ownerId, type, subject, grade, textbookCode, chapterCode, q, null, page, size, titleAscending ? Sort.by("title").ascending() : Sort.by("updatedAt").descending());
    }
    @Override @Transactional(readOnly = true) public SearchResult searchApproved(LibraryContentType type, Subject subject, String q, int page, int size) {
        Specification<LibraryContentEntity> spec = (root, cq, cb) -> { List<Predicate> ps = new ArrayList<>(); ps.add(cb.equal(root.get("status"), LibraryContentStatus.APPROVED)); ps.add(cb.isNull(root.get("deletedAt")));
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

        Query countQuery = entityManager.createNativeQuery("SELECT COUNT(*) FROM library_contents lc " + where);
        bindApprovedHubFilters(countQuery, type, subject, q);
        long total = ((Number) countQuery.getSingleResult()).longValue();
        return new HubSearchResult(rows.stream().map(JpaLibraryContentRepository::toHubContentSummary).toList(), total);
    }
    @Override @Transactional(readOnly = true) public SummarySearchResult searchSummariesByStatusAndSubject(LibraryContentStatus status, Subject subject, int page, int size) {
        return searchSummaries(null, null, subject, null, null, null, null, status, page, size, Sort.by("submittedAt").ascending());
    }

    private SummarySearchResult searchSummaries(UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String textbookCode, String chapterCode, String q, LibraryContentStatus status, int page, int size, Sort sort) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        var cb = entityManager.getCriteriaBuilder();
        var query = cb.createQuery(Object[].class);
        var root = query.from(LibraryContentEntity.class);
        List<Predicate> predicates = summaryPredicates(cb, root, ownerId, type, subject, grade, textbookCode, chapterCode, q, status);
        query.multiselect(root.get("id"), root.get("type"), root.get("title"), root.get("subject"), root.get("grade"), root.get("textbookCode"), root.get("chapterCode"), root.get("status"), root.get("thumbnailUrl"), root.get("createdAt"), root.get("updatedAt"), root.get("submittedAt"), root.get("rejectionReason"));
        query.where(predicates.toArray(Predicate[]::new));
        query.orderBy(sort.isSorted() ? sort.stream().map(order -> order.isAscending() ? cb.asc(root.get(order.getProperty())) : cb.desc(root.get(order.getProperty()))).toList() : List.of());
        List<LibraryContentSummary> items = entityManager.createQuery(query).setFirstResult(safePage * safeSize).setMaxResults(safeSize).getResultList().stream().map(JpaLibraryContentRepository::toSummary).toList();

        var countQuery = cb.createQuery(Long.class);
        var countRoot = countQuery.from(LibraryContentEntity.class);
        countQuery.select(cb.count(countRoot)).where(summaryPredicates(cb, countRoot, ownerId, type, subject, grade, textbookCode, chapterCode, q, status).toArray(Predicate[]::new));
        return new SummarySearchResult(items, entityManager.createQuery(countQuery).getSingleResult());
    }

    private static List<Predicate> summaryPredicates(jakarta.persistence.criteria.CriteriaBuilder cb, jakarta.persistence.criteria.Root<LibraryContentEntity> root, UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String textbookCode, String chapterCode, String q, LibraryContentStatus status) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.isNull(root.get("deletedAt")));
        if (ownerId != null) {
            predicates.add(cb.equal(root.get("ownerId"), ownerId));
            predicates.add(cb.isNull(root.get("sourceLibraryContentId")));
        }
        if (type != null) predicates.add(cb.equal(root.get("type"), type));
        if (subject != null) predicates.add(cb.equal(root.get("subject"), subject));
        if (grade != null) predicates.add(cb.equal(root.get("grade"), grade));
        if (textbookCode != null) predicates.add(cb.equal(root.get("textbookCode"), textbookCode));
        if (chapterCode != null) predicates.add(cb.equal(root.get("chapterCode"), chapterCode));
        if (status != null) predicates.add(cb.equal(root.get("status"), status));
        if (q != null && !q.isBlank()) predicates.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%"));
        return predicates;
    }
    @Override @Transactional(readOnly = true) public long countByStatusAndSubject(LibraryContentStatus status, Subject subject) {
        return jpa.countByStatusAndSubjectAndSourceLibraryContentIdIsNullAndDeletedAtIsNull(status, subject);
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
        return jpa.countByStatusAndSourceLibraryContentIdIsNullAndDeletedAtIsNull(status);
    }
    private static String approvedHubWhere(LibraryContentType type, Subject subject, String q) {
        StringBuilder where = new StringBuilder("""
                WHERE lc.status = 'APPROVED'
                  AND lc.deleted_at IS NULL
                  AND (lc.source_library_content_id IS NOT NULL
                       OR NOT EXISTS (SELECT 1 FROM library_contents snapshot
                                      WHERE snapshot.source_library_content_id = lc.id))
                """);
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
    private static LibraryContent toDomain(LibraryContentEntity e) { return new LibraryContent(e.getId(),e.getOwnerId(),e.getType(),e.getTitle(),e.getSubject(),e.getGrade(),e.getTextbookCode(),e.getChapterCode(),e.getStatus(),e.getPayload(),e.getThumbnailUrl(),e.getCreatedAt(),e.getUpdatedAt(),e.getSubmittedAt(),e.getDeletedAt(),e.getReviewedBy(),e.getReviewedAt(),e.getRejectionReason(),e.getVersion(),e.getSourceLibraryContentId()); }
    private static LibraryContentSummary toSummary(Object[] row) { return new LibraryContentSummary((UUID) row[0], (LibraryContentType) row[1], (String) row[2], (Subject) row[3], (Integer) row[4], (String) row[5], (String) row[6], (LibraryContentStatus) row[7], (String) row[8], (Instant) row[9], (Instant) row[10], (Instant) row[11], (String) row[12]); }
}
