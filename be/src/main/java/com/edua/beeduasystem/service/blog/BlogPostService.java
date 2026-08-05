package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.notification.NotificationService;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Nghiệp vụ bài blog cho Teacher: tạo (publish trực tiếp — BR-20), sửa/xóa của mình (owner-only — BR-16),
 * đọc danh sách/chi tiết. Nội dung HTML được sanitize trước khi lưu.
 */
@Service
public class BlogPostService {

    private static final int MAX_TITLE_LENGTH = 255;

    private final BlogPostRepository postRepository;
    private final BlogCommentRepository commentRepository;
    private final BlogContentSanitizer sanitizer;
    private final BlogAuthorResolver authorResolver;
    private final CurrentUserProvider currentUser;
    private final ActivityLogService activityLogService;
    private final NotificationService notificationService;

    public BlogPostService(BlogPostRepository postRepository,
                           BlogCommentRepository commentRepository,
                           BlogContentSanitizer sanitizer,
                           BlogAuthorResolver authorResolver,
                           CurrentUserProvider currentUser,
                           ActivityLogService activityLogService,
                           NotificationService notificationService) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.sanitizer = sanitizer;
        this.authorResolver = authorResolver;
        this.currentUser = currentUser;
        this.activityLogService = activityLogService;
        this.notificationService = notificationService;
    }

    /** Tạo bài mới, publish ngay (BR-20). */
    public BlogViews.PostDetail create(String title, String rawContent, String rawSubject, String thumbnailUrl) {
        UUID authorId = currentUser.requireUserId();
        String cleanTitle = requireTitle(title);
        String cleanContent = requireContent(rawContent);
        Subject subject = requireSubject(rawSubject);
        Instant now = Instant.now();
        BlogPost saved = postRepository.save(new BlogPost(
                UUID.randomUUID(), authorId, cleanTitle, cleanContent, cleanUrl(thumbnailUrl), subject,
                BlogPostStatus.PUBLISHED, null, null, now, now));
        return toDetail(saved);
    }

    /** Sửa bài của chính mình (owner-only). Các trường null = giữ nguyên. */
    public BlogViews.PostDetail update(UUID id, String title, String rawContent, String rawSubject, String thumbnailUrl) {
        BlogPost post = requirePublished(id);
        requireOwner(post.authorId());
        String newTitle = title != null ? requireTitle(title) : post.title();
        String newContent = rawContent != null ? requireContent(rawContent) : post.content();
        Subject newSubject = rawSubject != null ? requireSubject(rawSubject) : post.subject();
        BlogPost saved = postRepository.save(new BlogPost(
                post.id(), post.authorId(), newTitle, newContent, thumbnailUrl != null ? cleanUrl(thumbnailUrl) : post.thumbnailUrl(), newSubject,
                post.status(), post.removedReason(), post.removedBy(), post.createdAt(), Instant.now()));
        return toDetail(saved);
    }

    /** Xóa bài của chính mình (soft-delete — DELETED_BY_AUTHOR). */
    public void delete(UUID id) {
        BlogPost post = requirePublished(id);
        requireOwner(post.authorId());
        postRepository.save(new BlogPost(
                post.id(), post.authorId(), post.title(), post.content(), post.thumbnailUrl(), post.subject(),
                BlogPostStatus.DELETED_BY_AUTHOR, post.removedReason(), post.removedBy(),
                post.createdAt(), Instant.now()));
    }

    /**
     * Moderator gỡ bài vi phạm (BR-21): chỉ khi bài thuộc môn phụ trách, bắt buộc lý do.
     * Soft-delete kèm audit (removedReason + removedBy).
     */
    public void removeByModerator(UUID id, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Removal reason is required.");
        }
        BlogPost post = requirePublished(id);
        Subject moderatorSubject = currentUser.require().subject();
        if (moderatorSubject == null || post.subject() != moderatorSubject) {
            throw new ForbiddenOperationException("You can only remove posts in your assigned subject.");
        }
        UUID moderatorId = currentUser.requireUserId();
        postRepository.save(new BlogPost(
                post.id(), post.authorId(), post.title(), post.content(), post.thumbnailUrl(), post.subject(),
                BlogPostStatus.REMOVED_BY_MODERATOR, reason.trim(), moderatorId,
                post.createdAt(), Instant.now()));
        activityLogService.record(moderatorId, "MODERATOR", ActivityLogCategory.MODERATION,
                ActivityLogAction.REMOVE_BLOG_POST, "BLOG_POST", post.id(), reason.trim());
        notificationService.createForRecipient(post.authorId(), "Bài viết đã bị gỡ",
                "Bài viết \"" + post.title() + "\" đã bị gỡ bởi Moderator. Lý do: " + reason.trim());
    }

    /** Chi tiết bài PUBLISHED kèm bình luận. */
    public BlogViews.PostDetail getDetail(UUID id) {
        return toDetail(requirePublished(id));
    }

    /** Danh sách bài PUBLISHED, lọc tùy chọn theo môn/tác giả/từ khóa. */
    public BlogViews.Page<BlogViews.PostSummary> list(String rawSubject, UUID authorId, String q, int page, int size) {
        Subject subject = parseSubject(rawSubject);
        BlogPostRepository.SearchResult result = postRepository.search(subject, authorId, q, page, size);
        Map<UUID, BlogAuthorResolver.Profile> authors = authorResolver.profiles(result.items().stream().map(BlogPost::authorId).toList());
        Map<UUID, Long> commentCounts = commentRepository.countByPostIds(
                result.items().stream().map(BlogPost::id).toList());
        List<BlogViews.PostSummary> items = result.items().stream()
                .map(p -> new BlogViews.PostSummary(
                        p.id(), p.title(), p.subject(), p.authorId(),
                        authors.get(p.authorId()).name(), authors.get(p.authorId()).avatarUrl(), p.createdAt(),
                        commentCounts.getOrDefault(p.id(), 0L),
                        sanitizer.plainTextExcerpt(p.content(), 160),
                        p.thumbnailUrl() != null ? p.thumbnailUrl() : sanitizer.firstImageSrc(p.content())))
                .toList();
        return new BlogViews.Page<>(items, page, size, result.total());
    }

    private BlogViews.PostDetail toDetail(BlogPost post) {
        List<com.edua.beeduasystem.domain.model.blog.BlogComment> storedComments = commentRepository.findByPostId(post.id());
        var visibleCommentIds = storedComments.stream().map(com.edua.beeduasystem.domain.model.blog.BlogComment::id).collect(java.util.stream.Collectors.toSet());
        storedComments = storedComments.stream().filter(comment -> comment.parentCommentId() == null || visibleCommentIds.contains(comment.parentCommentId())).toList();
        Map<UUID, BlogAuthorResolver.Profile> commentAuthors = authorResolver.profiles(storedComments.stream().map(com.edua.beeduasystem.domain.model.blog.BlogComment::authorId).toList());
        List<BlogViews.CommentView> comments = storedComments.stream()
                .map(c -> new BlogViews.CommentView(
                        c.id(), c.content(), c.authorId(), c.parentCommentId(), commentAuthors.get(c.authorId()).name(),
                        commentAuthors.get(c.authorId()).avatarUrl(), c.createdAt(), c.updatedAt()))
                .toList();
        BlogAuthorResolver.Profile postAuthor = authorResolver.profile(post.authorId());
        return new BlogViews.PostDetail(
                post.id(), post.title(), post.content(), post.thumbnailUrl(), post.subject(), post.authorId(),
                postAuthor.name(), postAuthor.avatarUrl(), post.createdAt(), post.updatedAt(), comments);
    }

    private BlogPost requirePublished(UUID id) {
        return postRepository.findPublishedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blog post not found."));
    }

    private void requireOwner(UUID authorId) {
        if (!authorId.equals(currentUser.requireUserId())) {
            throw new ForbiddenOperationException("You can only modify your own blog post.");
        }
    }

    private String requireTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required.");
        }
        String cleanTitle = title.trim();
        if (cleanTitle.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("Title must not exceed 255 characters.");
        }
        return cleanTitle;
    }

    private String requireContent(String rawContent) {
        String clean = sanitizer.sanitize(rawContent);
        if (sanitizer.isEmpty(clean)) {
            throw new IllegalArgumentException("Content is required.");
        }
        return clean;
    }

    private String cleanUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String value = url.trim();
        if (value.length() > 1000) {
            throw new IllegalArgumentException("Thumbnail URL must not exceed 1000 characters.");
        }
        return value;
    }

    private Subject requireSubject(String rawSubject) {
        Subject subject = parseSubject(rawSubject);
        if (subject == null) {
            throw new IllegalArgumentException("Subject is required. Allowed: MATH, CHEMISTRY, PHYSICS.");
        }
        return subject;
    }

    static Subject parseSubject(String rawSubject) {
        if (rawSubject == null || rawSubject.isBlank()) {
            return null;
        }
        try {
            return Subject.valueOf(rawSubject.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                    "Invalid subject: " + rawSubject + ". Allowed: MATH, CHEMISTRY, PHYSICS.");
        }
    }
}
