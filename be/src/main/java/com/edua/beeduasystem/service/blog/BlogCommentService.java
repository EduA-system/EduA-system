package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Nghiệp vụ bình luận blog (BR-22): tạo trên bài đang PUBLISHED, sửa/xóa của chính mình (owner-only — BR-16).
 * Nội dung comment cũng được sanitize để chống XSS.
 */
@Service
public class BlogCommentService {

    private final BlogCommentRepository commentRepository;
    private final BlogPostRepository postRepository;
    private final BlogContentSanitizer sanitizer;
    private final BlogAuthorResolver authorResolver;
    private final CurrentUserProvider currentUser;

    public BlogCommentService(BlogCommentRepository commentRepository,
                              BlogPostRepository postRepository,
                              BlogContentSanitizer sanitizer,
                              BlogAuthorResolver authorResolver,
                              CurrentUserProvider currentUser) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
        this.sanitizer = sanitizer;
        this.authorResolver = authorResolver;
        this.currentUser = currentUser;
    }

    /** Bình luận trên một bài đang PUBLISHED. */
    public BlogViews.CommentView create(UUID postId, String rawContent) {
        if (postRepository.findPublishedById(postId).isEmpty()) {
            throw new ResourceNotFoundException("Blog post not found.");
        }
        UUID authorId = currentUser.requireUserId();
        String content = requireContent(rawContent);
        Instant now = Instant.now();
        BlogComment saved = commentRepository.save(new BlogComment(
                UUID.randomUUID(), postId, authorId, content, now, now));
        return toView(saved);
    }

    /** Sửa bình luận của chính mình. */
    public BlogViews.CommentView update(UUID commentId, String rawContent) {
        BlogComment comment = requireComment(commentId);
        requireOwner(comment.authorId());
        String content = requireContent(rawContent);
        BlogComment saved = commentRepository.save(new BlogComment(
                comment.id(), comment.postId(), comment.authorId(), content,
                comment.createdAt(), Instant.now()));
        return toView(saved);
    }

    /** Xóa bình luận của chính mình (hard delete). */
    public void delete(UUID commentId) {
        BlogComment comment = requireComment(commentId);
        requireOwner(comment.authorId());
        commentRepository.deleteById(commentId);
    }

    private BlogViews.CommentView toView(BlogComment comment) {
        return new BlogViews.CommentView(
                comment.id(), comment.content(), comment.authorId(),
                authorResolver.name(comment.authorId()), comment.createdAt(), comment.updatedAt());
    }

    private BlogComment requireComment(UUID commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found."));
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
        return clean;
    }
}
