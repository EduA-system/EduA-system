package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LibraryContentRepository {
    LibraryContent save(LibraryContent content);
    Optional<LibraryContent> findActiveById(UUID id);
    /**
     * Community Hub keeps approved publications visible after they are removed from Personal Library.
     */
    Optional<LibraryContent> findApprovedForHubById(UUID id);
    SearchResult search(UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String textbookCode, String chapterCode, String q, int page, int size, boolean titleAscending);
    /** Nội dung đang APPROVED, không giới hạn owner — dùng cho Community Hub feed + detail. */
    SearchResult searchApproved(LibraryContentType type, Subject subject, String q, int page, int size);
    /** Community Hub feed projection: page content, author name, and visible comment totals in one query. */
    HubSearchResult searchApprovedHubSummaries(LibraryContentType type, Subject subject, String q, int page, int size);
    /** Hàng đợi kiểm duyệt: nội dung theo một status + subject cụ thể (Moderator chỉ thấy đúng môn mình). */
    SearchResult searchByStatusAndSubject(LibraryContentStatus status, Subject subject, int page, int size);
    /** Thống kê Mod: tổng số nội dung theo status, cùng subject — dùng cho donut Duyệt/Từ chối (Hub). */
    long countByStatusAndSubject(LibraryContentStatus status, Subject subject);
    List<MonthTypeAggregate> countCreatedByMonthAndType(Instant fromInclusive, Instant toExclusive);
    List<SubjectTypeAggregate> countBySubjectAndType();
    long countByStatus(LibraryContentStatus status);
    record SearchResult(List<LibraryContent> items, long total) { }
    record HubSearchResult(List<HubContentSummary> items, long total) { }
    record HubContentSummary(UUID id, LibraryContentType type, String title, Subject subject, UUID ownerId,
                             String ownerName, String thumbnailUrl, Instant reviewedAt, long commentCount) { }
    record MonthTypeAggregate(String month, LibraryContentType type, long count) { }
    record SubjectTypeAggregate(Subject subject, LibraryContentType type, long count) { }
}
