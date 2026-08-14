package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.exception.StateConflictException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.*;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.notification.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service
public class LibraryContentService {
    private static final int NOTIFICATION_CONTENT_MAX_LENGTH = 2000;

    private final LibraryContentRepository repository;
    private final CurrentUserProvider currentUser;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;
    public LibraryContentService(LibraryContentRepository repository, CurrentUserProvider currentUser, ActivityLogService activityLogService, NotificationService notificationService) { this.repository = repository; this.currentUser = currentUser; this.activityLogService = activityLogService; this.notificationService = notificationService; }
    @Transactional(readOnly = true)
    public LibraryViews.Page list(String rawType, String rawSubject, Integer grade, String textbookCode, String chapterCode, String q, int page, int size, String sort) {
        return toPage(repository.search(currentUser.requireUserId(), parseType(rawType), parseSubject(rawSubject), grade, cleanCode(textbookCode), cleanCode(chapterCode), q, page, size, "title".equalsIgnoreCase(sort)), page, size);
    }
    @Transactional(readOnly = true)
    public LibraryViews.Detail get(UUID id) { return toDetail(requireOwner(id)); }
    @Transactional
    public LibraryViews.Detail create(String rawType, String title, String rawSubject, Integer grade, String textbookCode, String chapterCode, JsonNode payload, String thumbnailUrl) {
        LibraryContentType type = parseTypeRequired(rawType); Instant now = Instant.now();
        requirePhysicsTeacherForPreset(type, payload);
        return toDetail(repository.save(new LibraryContent(UUID.randomUUID(), currentUser.requireUserId(), type, requiredTitle(title), parseSubject(rawSubject), cleanGrade(grade), cleanCode(textbookCode), cleanCode(chapterCode), LibraryContentStatus.PRIVATE, payload == null ? JsonNodeFactory.instance.objectNode() : payload, cleanUrl(thumbnailUrl), now, now, null, null, null, null, null, null)));
    }
    @Transactional
    public LibraryViews.Detail update(UUID id, String title, String rawSubject, boolean subjectProvided, Integer grade, boolean gradeProvided, String textbookCode, boolean textbookCodeProvided, String chapterCode, boolean chapterCodeProvided, JsonNode payload, boolean payloadProvided, String thumbnailUrl, boolean thumbnailProvided) {
        LibraryContent c = requireOwner(id);
        Subject resolvedSubject = subjectProvided ? parseSubject(rawSubject) : c.subject();
        if (payloadProvided) requirePhysicsTeacherForPreset(c.type(), payload);
        if (resolvedSubject == null && c.status() == LibraryContentStatus.SUBMITTED) throw new IllegalArgumentException("Không thể bỏ trống môn học khi nội dung đang chờ duyệt.");
        return toDetail(repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(), title == null ? c.title() : requiredTitle(title), resolvedSubject, gradeProvided ? cleanGrade(grade) : c.grade(), textbookCodeProvided ? cleanCode(textbookCode) : c.textbookCode(), chapterCodeProvided ? cleanCode(chapterCode) : c.chapterCode(), c.status(), payloadProvided ? (payload == null ? JsonNodeFactory.instance.objectNode() : payload) : c.payload(), thumbnailProvided ? cleanUrl(thumbnailUrl) : c.thumbnailUrl(), c.createdAt(), Instant.now(), c.submittedAt(), null, c.reviewedBy(), c.reviewedAt(), c.rejectionReason(), c.version())));
    }
    @Transactional
    public void delete(UUID id) { LibraryContent c = requireOwner(id); repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),c.status(),c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),c.submittedAt(),Instant.now(),c.reviewedBy(),c.reviewedAt(),c.rejectionReason(),c.version())); }
    /** Gửi duyệt: từ PRIVATE (lần đầu) hoặc REJECTED (gửi lại sau khi bị từ chối). */
    @Transactional
    public LibraryViews.Detail submit(UUID id) {
        LibraryContent c = requireOwner(id);
        if (isPhysicsSimulation(c)) {
            throw new ForbiddenOperationException("Mô phỏng Vật lý chỉ được lưu trong thư viện cá nhân, không thể gửi lên Community Hub.");
        }
        if (c.status() != LibraryContentStatus.PRIVATE && c.status() != LibraryContentStatus.REJECTED) throw new StateConflictException("Only private or rejected content can be submitted for review.");
        if (c.subject() == null) throw new IllegalArgumentException("Nội dung chưa được gán môn học. Vui lòng chọn môn học trước khi gửi duyệt.");
        LibraryContent saved = repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),LibraryContentStatus.SUBMITTED,c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),Instant.now(),null,null,null,null,c.version()));
        notificationService.notifyRoleSubject(Role.MODERATOR, c.subject(), c.ownerId(),
                "Có giáo án mới chờ duyệt lên Community Hub",
                "Giáo án \"" + c.title() + "\" đã được gửi lên hàng chờ duyệt Community Hub.",
                "HUB_MODERATION", "/hub-moderation");
        return toDetail(saved);
    }
    @Transactional
    public LibraryViews.Detail unsubmit(UUID id) {
        LibraryContent c = requireOwner(id);
        if (c.status() != LibraryContentStatus.SUBMITTED) throw new StateConflictException("Only submitted content can be unsubmitted.");
        return toDetail(repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),LibraryContentStatus.PRIVATE,c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),null,null,null,null,null,c.version())));
    }
    /** Moderator duyệt content SUBMITTED cùng subject với mình lên Hub công khai. */
    @Transactional
    public LibraryViews.Detail approve(UUID id) {
        LibraryContent c = requireSubmittedInModeratorSubject(id);
        UUID moderatorId = currentUser.requireUserId();
        LibraryViews.Detail detail = toDetail(repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),LibraryContentStatus.APPROVED,c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),c.submittedAt(),null,moderatorId,Instant.now(),null,c.version())));
        activityLogService.record(moderatorId, "MODERATOR", ActivityLogCategory.MODERATION,
                ActivityLogAction.APPROVE_LIBRARY_CONTENT, "LIBRARY_CONTENT", c.id(), null);
        notificationService.notifyRecipient(c.ownerId(), moderatorId, c.subject(),
                "Chúc mừng! Bài đăng đã lên Community Hub",
                "Nội dung \"" + c.title() + "\" đã được duyệt và hiển thị trên Community Hub.",
                "HUB_CONTENT", "/community-hub");
        return detail;
    }
    /** Moderator từ chối content SUBMITTED cùng subject với mình, bắt buộc lý do. */
    @Transactional
    public LibraryViews.Detail reject(UUID id, String rawReason) {
        if (rawReason == null || rawReason.isBlank()) throw new IllegalArgumentException("Rejection reason is required.");
        LibraryContent c = requireSubmittedInModeratorSubject(id);
        String reason = rawReason.trim();
        UUID moderatorId = currentUser.requireUserId();
        LibraryViews.Detail detail = toDetail(repository.save(new LibraryContent(c.id(),c.ownerId(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),LibraryContentStatus.REJECTED,c.payload(),c.thumbnailUrl(),c.createdAt(),Instant.now(),c.submittedAt(),null,moderatorId,Instant.now(),reason,c.version())));
        activityLogService.record(moderatorId, "MODERATOR", ActivityLogCategory.MODERATION,
                ActivityLogAction.REJECT_LIBRARY_CONTENT, "LIBRARY_CONTENT", c.id(), reason);
        notificationService.notifyRecipient(c.ownerId(), moderatorId, c.subject(),
                "Nội dung gửi lên Community Hub bị từ chối",
                rejectionNotificationContent(c.title(), reason),
                "HUB_CONTENT_REJECTION", "/library");
        return detail;
    }
    /** Hàng đợi kiểm duyệt: content SUBMITTED cùng subject với Moderator hiện tại. */
    @Transactional(readOnly = true)
    public LibraryViews.Page listModerationQueue(int page, int size) {
        Subject moderatorSubject = currentUser.require().subject();
        if (moderatorSubject == null) throw new ForbiddenOperationException("Moderator must have a subject to review content.");
        return toPage(repository.searchByStatusAndSubject(LibraryContentStatus.SUBMITTED, moderatorSubject, page, size), page, size);
    }
    /** Chi tiết content đang chờ duyệt: Moderator chỉ xem được submission cùng subject. */
    @Transactional(readOnly = true)
    public LibraryViews.Detail getModerationDetail(UUID id) {
        return toDetail(requireSubmittedInModeratorSubject(id));
    }
    private LibraryContent requireSubmittedInModeratorSubject(UUID id) {
        LibraryContent c = repository.findActiveById(id).orElseThrow(() -> new ResourceNotFoundException("Library content not found."));
        if (c.status() != LibraryContentStatus.SUBMITTED) throw new StateConflictException("Only submitted content can be reviewed.");
        Subject moderatorSubject = currentUser.require().subject();
        if (moderatorSubject == null || c.subject() != moderatorSubject) throw new ForbiddenOperationException("You can only review content in your assigned subject.");
        return c;
    }
    private LibraryContent requireOwner(UUID id) { LibraryContent c = repository.findActiveById(id).orElseThrow(() -> new ResourceNotFoundException("Library content not found.")); if (!c.ownerId().equals(currentUser.requireUserId())) throw new ForbiddenOperationException("You can only access your own library content."); return c; }
    private static LibraryViews.Page toPage(LibraryContentRepository.SearchResult r, int page, int size) { return new LibraryViews.Page(r.items().stream().map(LibraryContentService::toSummary).toList(), Math.max(0,page), Math.min(Math.max(1,size),100), r.total()); }
    private static LibraryViews.Summary toSummary(LibraryContent c) { return new LibraryViews.Summary(c.id(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),c.status(),c.thumbnailUrl(),c.createdAt(),c.updatedAt(),c.submittedAt(),c.rejectionReason()); }
    private static LibraryViews.Detail toDetail(LibraryContent c) { return new LibraryViews.Detail(c.id(),c.type(),c.title(),c.subject(),c.grade(),c.textbookCode(),c.chapterCode(),c.status(),c.payload(),c.thumbnailUrl(),c.createdAt(),c.updatedAt(),c.submittedAt(),c.rejectionReason()); }
    private static String requiredTitle(String title) { if (title == null || title.isBlank()) throw new IllegalArgumentException("Title is required."); return title.trim(); }
    private static String cleanUrl(String url) { return url == null || url.isBlank() ? null : url.trim(); }
    private static String cleanCode(String code) { return code == null || code.isBlank() ? null : code.trim(); }
    private static String rejectionNotificationContent(String title, String reason) {
        String prefix = "Nội dung \"" + title + "\" bị từ chối. Lý do: ";
        int budget = NOTIFICATION_CONTENT_MAX_LENGTH - prefix.length();
        if (budget <= 0) return prefix.substring(0, NOTIFICATION_CONTENT_MAX_LENGTH);
        if (reason.length() <= budget) return prefix + reason;
        String suffix = "...";
        int reasonBudget = Math.max(0, budget - suffix.length());
        return prefix + reason.substring(0, reasonBudget) + suffix;
    }
    private static Integer cleanGrade(Integer grade) { if (grade == null) return null; if (grade < 10 || grade > 12) throw new IllegalArgumentException("Invalid grade. Allowed: 10, 11, 12."); return grade; }
    private void requirePhysicsTeacherForPreset(LibraryContentType type, JsonNode payload) {
        if (type != LibraryContentType.SIMULATION || payload == null || !"physics-preset".equals(payload.path("source").asText())) return;
        var claims = currentUser.require();
        if (!claims.roles().contains(Role.TEACHER) || claims.subject() != Subject.PHYSICS) {
            throw new ForbiddenOperationException("Chỉ giáo viên Vật lý mới có thể lưu mô phỏng Vật lý vào thư viện cá nhân.");
        }
    }
    private static boolean isPhysicsSimulation(LibraryContent content) {
        return content.type() == LibraryContentType.SIMULATION && content.subject() == Subject.PHYSICS;
    }
    private static LibraryContentType parseTypeRequired(String value) { LibraryContentType type = parseType(value); if(type == null) throw new IllegalArgumentException("Type is required. Allowed: LESSON_PLAN, SLIDE_DECK, TEST, SIMULATION."); return type; }
    private static LibraryContentType parseType(String value) { if(value == null || value.isBlank()) return null; try { return LibraryContentType.valueOf(value.trim().toUpperCase()); } catch(IllegalArgumentException e) { throw new IllegalArgumentException("Invalid type."); } }
    private static Subject parseSubject(String value) { if(value == null || value.isBlank()) return null; try { return Subject.valueOf(value.trim().toUpperCase()); } catch(IllegalArgumentException e) { throw new IllegalArgumentException("Invalid subject. Allowed: MATH, CHEMISTRY, PHYSICS."); } }
}
