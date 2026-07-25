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
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Bình luận trên content Community Hub đang APPROVED. Sửa của chính mình (owner-only);
 * xóa cho phép nếu là tác giả bình luận HOẶC chủ sở hữu content (đúng 2 yêu cầu WBS trong 1 rule).
 */
@Service
public class HubCommentService {

    private final HubCommentRepository commentRepository;
    private final LibraryContentRepository contentRepository;
    private final AppUserRepository userRepository;
    private final BlogContentSanitizer sanitizer;
    private final CurrentUserProvider currentUser;

    public HubCommentService(HubCommentRepository commentRepository,
                             LibraryContentRepository contentRepository,
                             AppUserRepository userRepository,
                             BlogContentSanitizer sanitizer,
                             CurrentUserProvider currentUser) {
        this.commentRepository = commentRepository;
        this.contentRepository = contentRepository;
        this.userRepository = userRepository;
        this.sanitizer = sanitizer;
        this.currentUser = currentUser;
    }

    public HubViews.CommentView create(UUID contentId, String rawContent) {
        requireApprovedContent(contentId);
        UUID authorId = currentUser.requireUserId();
        String content = requireContent(rawContent);
        Instant now = Instant.now();
        HubComment saved = commentRepository.save(new HubComment(UUID.randomUUID(), contentId, authorId, content, now, now));
        return toView(saved);
    }

    public HubViews.CommentView update(UUID commentId, String rawContent) {
        HubComment comment = requireComment(commentId);
        if (!comment.authorId().equals(currentUser.requireUserId())) {
            throw new ForbiddenOperationException("You can only edit your own comment.");
        }
        String content = requireContent(rawContent);
        HubComment saved = commentRepository.save(new HubComment(comment.id(), comment.libraryContentId(), comment.authorId(), content, comment.createdAt(), Instant.now()));
        return toView(saved);
    }

    public void delete(UUID commentId) {
        HubComment comment = requireComment(commentId);
        UUID userId = currentUser.requireUserId();
        LibraryContent content = contentRepository.findActiveById(comment.libraryContentId())
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
        boolean isCommentAuthor = comment.authorId().equals(userId);
        boolean isContentOwner = content.ownerId().equals(userId);
        if (!isCommentAuthor && !isContentOwner) {
            throw new ForbiddenOperationException("You can only delete your own comment or comments on your own content.");
        }
        commentRepository.deleteById(commentId);
    }

    private void requireApprovedContent(UUID contentId) {
        LibraryContent content = contentRepository.findActiveById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
        if (content.status() != LibraryContentStatus.APPROVED) {
            throw new ResourceNotFoundException("Content not found.");
        }
    }

    private HubComment requireComment(UUID commentId) {
        return commentRepository.findById(commentId).orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
    }

    private String requireContent(String rawContent) {
        String clean = sanitizer.sanitize(rawContent);
        if (sanitizer.isEmpty(clean)) {
            throw new IllegalArgumentException("Comment content is required.");
        }
        return clean;
    }

    private HubViews.CommentView toView(HubComment comment) {
        String authorName = userRepository.findById(comment.authorId()).map(HubCommentService::displayName).orElse(null);
        return new HubViews.CommentView(comment.id(), comment.content(), comment.authorId(), authorName, comment.createdAt(), comment.updatedAt());
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
