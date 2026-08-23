package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.notification.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Nghiệp vụ bình luận blog (BR-22): tạo trên bài đang PUBLISHED, sửa/xóa của chính mình (owner-only — BR-16).
 * Nội dung comment cũng được sanitize để chống XSS.
 */
@Service
public class BlogCommentService {

    private static final int COMMENT_MAX_WORDS = 200;

    private final BlogCommentRepository commentRepository;
    private final BlogPostRepository postRepository;
    private final BlogContentSanitizer sanitizer;
    private final BlogAuthorResolver authorResolver;
    private final CurrentUserProvider currentUser;
    private final NotificationService notificationService;

    public BlogCommentService(BlogCommentRepository commentRepository,
                              BlogPostRepository postRepository,
                              BlogContentSanitizer sanitizer,
                              BlogAuthorResolver authorResolver,
                              CurrentUserProvider currentUser,
                              NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.sanitizer = sanitizer;
        this.authorResolver = authorResolver;
        this.currentUser = currentUser;
        this.notificationService = notificationService;
    }

    /** Bình luận trên một bài đang PUBLISHED. */
    public BlogViews.CommentView create(UUID postId, String rawContent, UUID parentCommentId) {
        BlogPost post = postRepository.findPublishedById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found."));
        UUID authorId = currentUser.requireUserId();
        String content = requireContent(rawContent);
        BlogComment parent = null;
        if (parentCommentId != null) {
            parent = requireComment(parentCommentId);
            if (!parent.postId().equals(postId) || parent.parentCommentId() != null) {
                throw new IllegalArgumentException("Reply target is invalid.");
            }
        }
        Instant now = Instant.now();
        BlogComment saved = commentRepository.save(new BlogComment(
                UUID.randomUUID(), postId, authorId, parentCommentId, content, now, now, null, null));
        notifyParticipants(post, parent, authorId);
        return toView(saved);
    }

    /**
     * Thông báo cho chủ bài viết (có bình luận mới) và/hoặc tác giả comment cha (có người trả lời),
     * bỏ qua nếu người nhận chính là người vừa bình luận (BR: không tự thông báo cho bản thân).
     * Nếu chủ bài viết cũng chính là tác giả comment cha, chỉ gửi 1 thông báo (nội dung "trả lời") — tránh trùng lặp.
     */
    private void notifyParticipants(BlogPost post, BlogComment parent, UUID commentAuthorId) {
        String actorName = authorResolver.name(commentAuthorId);
        if (actorName == null) actorName = "Một giáo viên";
        String targetUrl = "/blog/" + post.id();

        Map<UUID, Runnable> notifications = new LinkedHashMap<>();
        if (!post.authorId().equals(commentAuthorId)) {
            String finalActorName = actorName;
            notifications.put(post.authorId(), () -> notificationService.notifyRecipient(
                    post.authorId(), commentAuthorId, post.subject(),
                    "Bình luận mới trên bài viết của bạn",
                    finalActorName + " đã bình luận bài viết \"" + post.title() + "\" của bạn.",
                    "BLOG_POST", targetUrl));
        }
        if (parent != null && !parent.authorId().equals(commentAuthorId)) {
            String finalActorName = actorName;
            notifications.put(parent.authorId(), () -> notificationService.notifyRecipient(
                    parent.authorId(), commentAuthorId, post.subject(),
                    "Có người trả lời bình luận của bạn",
                    finalActorName + " đã trả lời bình luận của bạn trong bài viết \"" + post.title() + "\".",
                    "BLOG_COMMENT", targetUrl));
        }
        notifications.values().forEach(Runnable::run);
    }

    /** Sửa bình luận của chính mình. */
    public BlogViews.CommentView update(UUID commentId, String rawContent) {
        BlogComment comment = requireComment(commentId);
        requireOwner(comment.authorId());
        String content = requireContent(rawContent);
        BlogComment saved = commentRepository.save(new BlogComment(
                comment.id(), comment.postId(), comment.authorId(), comment.parentCommentId(), content,
                comment.createdAt(), Instant.now(), comment.hiddenAt(), comment.hiddenBy()));
        return toView(saved);
    }

    /** Xóa vĩnh viễn bình luận của chính mình. */
    @Transactional
    public void delete(UUID commentId) {
        BlogComment comment = requireComment(commentId);
        requireOwner(comment.authorId());
        if (comment.parentCommentId() == null) {
            commentRepository.findByPostId(comment.postId()).stream()
                    .filter(reply -> commentId.equals(reply.parentCommentId()))
                    .forEach(reply -> commentRepository.deleteById(reply.id()));
        }
        commentRepository.deleteById(commentId);
    }

    /** Chủ bài viết có thể ẩn mềm bình luận của người khác cùng các phản hồi trực tiếp của nó. */
    @Transactional
    public void hideByPostAuthor(UUID commentId) {
        BlogComment comment = requireComment(commentId);
        UUID userId = currentUser.requireUserId();
        if (comment.authorId().equals(userId)) {
            throw new IllegalArgumentException("Use the delete action to remove your own comment.");
        }
        var post = postRepository.findPublishedById(comment.postId())
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found."));
        if (!post.authorId().equals(userId)) {
            throw new ForbiddenOperationException("You can only hide comments on your own blog post.");
        }
        Instant now = Instant.now();
        commentRepository.save(new BlogComment(
                comment.id(), comment.postId(), comment.authorId(), comment.parentCommentId(), comment.content(),
                comment.createdAt(), now, now, userId));
        if (comment.parentCommentId() == null) {
            commentRepository.findByPostId(comment.postId()).stream()
                    .filter(reply -> comment.id().equals(reply.parentCommentId()))
                    .forEach(reply -> commentRepository.save(new BlogComment(
                            reply.id(), reply.postId(), reply.authorId(), reply.parentCommentId(), reply.content(),
                            reply.createdAt(), now, now, userId)));
        }
    }

    private BlogViews.CommentView toView(BlogComment comment) {
        BlogAuthorResolver.Profile author = authorResolver.profile(comment.authorId());
        return new BlogViews.CommentView(
                comment.id(), comment.content(),
                comment.authorId(), comment.parentCommentId(),
                author.name(), author.avatarUrl(), comment.createdAt(), comment.updatedAt(), false);
    }

    private BlogComment requireComment(UUID commentId) {
        BlogComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
        if (comment.hiddenAt() != null) {
            throw new ResourceNotFoundException("Comment not found.");
        }
        return comment;
    }

    private void requireOwner(UUID authorId) {
        if (!authorId.equals(currentUser.requireUserId())) {
            throw new ForbiddenOperationException("You can only modify your own comment.");
        }
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
        String plainText = value.replaceAll("<[^>]+>", " ").trim();
        return plainText.isEmpty() ? 0 : plainText.split("\\s+").length;
    }
}
