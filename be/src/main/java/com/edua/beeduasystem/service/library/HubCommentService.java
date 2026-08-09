package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.library.HubComment;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import com.edua.beeduasystem.service.notification.NotificationService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Bình luận trên content Community Hub đang APPROVED. Sửa của chính mình (owner-only);
 * xóa cho phép nếu là tác giả bình luận HOẶC chủ sở hữu content (đúng 2 yêu cầu WBS trong 1 rule).
 */
@Service
public class HubCommentService {
    private static final int COMMENT_MAX_WORDS = 200;

    private final HubCommentRepository commentRepository;
    private final LibraryContentRepository contentRepository;
    private final AppUserRepository userRepository;
    private final BlogContentSanitizer sanitizer;
    private final CurrentUserProvider currentUser;
    private final NotificationService notificationService;

    public HubCommentService(HubCommentRepository commentRepository,
                             LibraryContentRepository contentRepository,
                             AppUserRepository userRepository,
                             BlogContentSanitizer sanitizer,
                             CurrentUserProvider currentUser,
                             NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.contentRepository = contentRepository;
        this.userRepository = userRepository;
        this.sanitizer = sanitizer;
        this.currentUser = currentUser;
        this.notificationService = notificationService;
    }

    public HubViews.CommentView create(UUID contentId, String rawContent, UUID parentCommentId) {
        LibraryContent contentItem = requireApprovedContent(contentId);
        UUID authorId = currentUser.requireUserId();
        String content = requireContent(rawContent);
        HubComment parent = null;
        if (parentCommentId != null) {
            parent = requireComment(parentCommentId);
            if (!parent.libraryContentId().equals(contentId) || parent.parentCommentId() != null) {
                throw new IllegalArgumentException("Reply target is invalid.");
            }
        }
        Instant now = Instant.now();
        HubComment saved = commentRepository.save(new HubComment(UUID.randomUUID(), contentId, authorId, parentCommentId, content, now, now, null, null));
        notifyParticipants(contentItem, parent, authorId);
        return toView(saved);
    }

    private void notifyParticipants(LibraryContent content, HubComment parent, UUID commentAuthorId) {
        String actorName = displayName(commentAuthorId);
        if (actorName == null) actorName = "Một giáo viên";
        String targetUrl = "/community-hub/" + content.id();

        Map<UUID, Runnable> notifications = new LinkedHashMap<>();
        if (!content.ownerId().equals(commentAuthorId)) {
            String finalActorName = actorName;
            notifications.put(content.ownerId(), () -> notificationService.notifyRecipient(
                    content.ownerId(), commentAuthorId, content.subject(),
                    "Bình luận mới trên bài đăng Community Hub",
                    finalActorName + " đã bình luận bài đăng \"" + content.title() + "\" của bạn.",
                    "HUB_CONTENT", targetUrl));
        }
        if (parent != null && !parent.authorId().equals(commentAuthorId)) {
            String finalActorName = actorName;
            notifications.put(parent.authorId(), () -> notificationService.notifyRecipient(
                    parent.authorId(), commentAuthorId, content.subject(),
                    "Có người trả lời bình luận của bạn",
                    finalActorName + " đã trả lời bình luận của bạn trong bài đăng \"" + content.title() + "\".",
                    "HUB_COMMENT", targetUrl));
        }
        notifications.values().forEach(Runnable::run);
    }

    public HubViews.CommentView update(UUID commentId, String rawContent) {
        HubComment comment = requireComment(commentId);
        if (!comment.authorId().equals(currentUser.requireUserId())) {
            throw new ForbiddenOperationException("You can only edit your own comment.");
        }
        String content = requireContent(rawContent);
        HubComment saved = commentRepository.save(new HubComment(comment.id(), comment.libraryContentId(), comment.authorId(), comment.parentCommentId(), content,
                comment.createdAt(), Instant.now(), comment.hiddenAt(), comment.hiddenBy()));
        return toView(saved);
    }

    public void delete(UUID commentId) {
        HubComment comment = requireComment(commentId);
        UUID userId = currentUser.requireUserId();
        if (!comment.authorId().equals(userId)) {
            throw new ForbiddenOperationException("You can only delete your own comment.");
        }
        commentRepository.deleteById(commentId);
    }

    public void hideByContentOwner(UUID commentId) {
        HubComment comment = requireComment(commentId);
        UUID userId = currentUser.requireUserId();
        if (comment.authorId().equals(userId)) {
            throw new IllegalArgumentException("Use the delete action to remove your own comment.");
        }
        LibraryContent content = contentRepository.findActiveById(comment.libraryContentId())
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
        if (!content.ownerId().equals(userId)) {
            throw new ForbiddenOperationException("You can only hide comments on your own Hub content.");
        }
        Instant now = Instant.now();
        commentRepository.save(new HubComment(comment.id(), comment.libraryContentId(), comment.authorId(), comment.parentCommentId(), comment.content(),
                comment.createdAt(), now, now, userId));
        if (comment.parentCommentId() == null) {
            commentRepository.findByLibraryContentId(comment.libraryContentId()).stream()
                    .filter(reply -> comment.id().equals(reply.parentCommentId()))
                    .forEach(reply -> commentRepository.save(new HubComment(reply.id(), reply.libraryContentId(), reply.authorId(), reply.parentCommentId(), reply.content(),
                            reply.createdAt(), now, now, userId)));
        }
    }

    private LibraryContent requireApprovedContent(UUID contentId) {
        LibraryContent content = contentRepository.findActiveById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
        if (content.status() != LibraryContentStatus.APPROVED) {
            throw new ResourceNotFoundException("Content not found.");
        }
        return content;
    }

    private HubComment requireComment(UUID commentId) {
        HubComment comment = commentRepository.findById(commentId).orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
        if (comment.hiddenAt() != null) {
            throw new ResourceNotFoundException("Comment not found.");
        }
        return comment;
    }

    private String requireContent(String rawContent) {
        String clean = sanitizer.sanitize(rawContent);
        if (sanitizer.isEmpty(clean)) {
            throw new IllegalArgumentException("Comment content is required.");
        }
        if (wordCount(clean) > COMMENT_MAX_WORDS) {
            throw new IllegalArgumentException("Comment must not exceed " + COMMENT_MAX_WORDS + " words.");
        }
        return clean;
    }

    private static int wordCount(String value) {
        return value.replaceAll("<[^>]+>", " ").trim().isEmpty()
                ? 0
                : value.replaceAll("<[^>]+>", " ").trim().split("\\s+").length;
    }

    private HubViews.CommentView toView(HubComment comment) {
        String authorName = displayName(comment.authorId());
        return new HubViews.CommentView(comment.id(), comment.content(), comment.authorId(), comment.parentCommentId(), authorName, comment.createdAt(), comment.updatedAt());
    }

    private String displayName(UUID userId) {
        return userRepository.findById(userId).map(HubCommentService::displayName).orElse(null);
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
