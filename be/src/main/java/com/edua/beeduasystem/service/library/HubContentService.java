package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.stream.Collectors;
import java.util.UUID;

/**
 * Community Hub: tài khoản được cấp quyền xem feed/chi tiết content đã APPROVED
 * và "tùy biến" (copy) một content về thư viện riêng.
 */
@Service
public class HubContentService {

    private final LibraryContentRepository repository;
    private final HubCommentRepository commentRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUser;

    public HubContentService(LibraryContentRepository repository,
                             HubCommentRepository commentRepository,
                             AppUserRepository userRepository,
                             CurrentUserProvider currentUser) {
        this.repository = repository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    /** Danh sách content APPROVED, public — không lọc theo owner. */
    public HubViews.Page<HubViews.ContentSummary> list(String rawType, String rawSubject, String q, int page, int size) {
        LibraryContentRepository.HubSearchResult result = repository.searchApprovedHubSummaries(parseType(rawType), parseSubject(rawSubject), q, page, size);
        return new HubViews.Page<>(result.items().stream().map(HubContentService::toSummary).toList(), Math.max(0, page), Math.min(Math.max(1, size), 100), result.total());
    }

    /** Chi tiết content APPROVED kèm bình luận — guest preview. */
    public HubViews.ContentDetail get(UUID id) {
        return toDetail(requireApproved(id));
    }

    /** Copy content APPROVED thành một bản riêng (PRIVATE) thuộc sở hữu của user hiện tại. */
    public LibraryViews.Detail customize(UUID id) {
        LibraryContent original = requireApproved(id);
        UUID ownerId = currentUser.requireUserId();
        Instant now = Instant.now();
        LibraryContent copy = new LibraryContent(UUID.randomUUID(), ownerId, original.type(), original.title() + " (bản sao)",
                original.subject(), original.grade(), original.textbookCode(), original.chapterCode(), LibraryContentStatus.PRIVATE, original.payload(), original.thumbnailUrl(),
                now, now, null, null, null, null, null);
        LibraryContent saved = repository.save(copy);
        return new LibraryViews.Detail(saved.id(), saved.type(), saved.title(),
                saved.subject(), saved.grade(), saved.textbookCode(), saved.chapterCode(), saved.status(), saved.payload(), saved.thumbnailUrl(), saved.createdAt(),
                saved.updatedAt(), saved.submittedAt(), saved.rejectionReason());
    }

    private LibraryContent requireApproved(UUID id) {
        return repository.findApprovedForHubById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
    }

    private static HubViews.ContentSummary toSummary(LibraryContentRepository.HubContentSummary content) {
        return new HubViews.ContentSummary(content.id(), content.type(), content.title(), content.subject(), content.ownerId(), content.ownerName(),
                content.thumbnailUrl(), content.reviewedAt(), content.commentCount());
    }

    private HubViews.ContentDetail toDetail(LibraryContent c) {
        var storedComments = commentRepository.findByLibraryContentId(c.id());
        var visibleCommentIds = storedComments.stream().map(cm -> cm.id()).collect(Collectors.toSet());
        storedComments = storedComments.stream()
                .filter(cm -> cm.parentCommentId() == null || visibleCommentIds.contains(cm.parentCommentId()))
                .toList();
        var comments = storedComments.stream()
                .map(cm -> new HubViews.CommentView(cm.id(), cm.content(), cm.authorId(), cm.parentCommentId(), ownerName(cm.authorId()), cm.createdAt(), cm.updatedAt()))
                .toList();
        return new HubViews.ContentDetail(c.id(), c.type(), c.title(), c.subject(), c.ownerId(), ownerName(c.ownerId()),
                c.payload(), c.thumbnailUrl(), c.reviewedAt(), comments);
    }

    private String ownerName(UUID userId) {
        return userRepository.findById(userId).map(HubContentService::displayName).orElse(null);
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }

    private static LibraryContentType parseType(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LibraryContentType.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Invalid type."); }
    }

    private static Subject parseSubject(String value) {
        if (value == null || value.isBlank()) return null;
        try { return Subject.valueOf(value.trim().toUpperCase()); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Invalid subject. Allowed: MATH, CHEMISTRY, PHYSICS."); }
    }
}
