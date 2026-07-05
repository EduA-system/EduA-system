package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.blog.CreateBlogCommentRequest;
import com.edua.beeduasystem.presentation.dto.blog.CreateBlogPostRequest;
import com.edua.beeduasystem.presentation.dto.blog.UpdateBlogCommentRequest;
import com.edua.beeduasystem.presentation.dto.blog.UpdateBlogPostRequest;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogCommentService;
import com.edua.beeduasystem.service.blog.BlogPostService;
import com.edua.beeduasystem.service.blog.BlogViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Blog cộng đồng giáo viên (giai đoạn này: role Teacher). Đọc = mọi user đã đăng nhập;
 * tạo/sửa/xóa bài & bình luận = TEACHER + owner-only (kiểm trong service). Spec: designs/API_designs/blog.md.
 */
@RestController
@RequestMapping("/api")
@Tag(name = "Blog", description = "Blog cộng đồng giáo viên: bài viết + bình luận (BR-16/20/22)")
public class BlogController {

    private final BlogPostService postService;
    private final BlogCommentService commentService;
    private final CurrentUserProvider currentUser;

    public BlogController(BlogPostService postService,
                          BlogCommentService commentService,
                          CurrentUserProvider currentUser) {
        this.postService = postService;
        this.commentService = commentService;
        this.currentUser = currentUser;
    }

    @GetMapping("/blog-posts")
    @Operation(summary = "Danh sách bài blog (PUBLISHED)",
            description = "Lọc tùy chọn: subject, authorId (dùng 'me' để lấy bài của mình), q (từ khóa tiêu đề). "
                    + "Phân trang page/size. Trả bản tóm tắt (không kèm nội dung).")
    public BlogViews.Page<BlogViews.PostSummary> list(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String authorId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return postService.list(subject, resolveAuthorId(authorId), q, page, size);
    }

    @GetMapping("/blog-posts/{id}")
    @Operation(summary = "Chi tiết bài blog + bình luận")
    public BlogViews.PostDetail detail(@PathVariable UUID id) {
        return postService.getDetail(id);
    }

    @PostMapping("/blog-posts")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Tạo bài blog (publish trực tiếp — BR-20)")
    public BlogViews.PostDetail create(@RequestBody CreateBlogPostRequest request) {
        return postService.create(request.title(), request.content(), request.subject());
    }

    @PatchMapping("/blog-posts/{id}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Sửa bài của mình (owner-only — BR-16)")
    public BlogViews.PostDetail update(@PathVariable UUID id, @RequestBody UpdateBlogPostRequest request) {
        return postService.update(id, request.title(), request.content(), request.subject());
    }

    @DeleteMapping("/blog-posts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Xóa bài của mình (soft-delete — BR-16)")
    public void delete(@PathVariable UUID id) {
        postService.delete(id);
    }

    @PostMapping("/blog-posts/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Bình luận trên một bài (BR-22)")
    public BlogViews.CommentView createComment(@PathVariable UUID id,
                                               @RequestBody CreateBlogCommentRequest request) {
        return commentService.create(id, request.content());
    }

    @PatchMapping("/blog-comments/{commentId}")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Sửa bình luận của mình (owner-only — BR-16)")
    public BlogViews.CommentView updateComment(@PathVariable UUID commentId,
                                               @RequestBody UpdateBlogCommentRequest request) {
        return commentService.update(commentId, request.content());
    }

    @DeleteMapping("/blog-comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Xóa bình luận của mình (owner-only — BR-16)")
    public void deleteComment(@PathVariable UUID commentId) {
        commentService.delete(commentId);
    }

    /** 'me' → user hiện tại; UUID hợp lệ → chính nó; null/blank → không lọc. */
    private UUID resolveAuthorId(String authorId) {
        if (authorId == null || authorId.isBlank()) {
            return null;
        }
        if ("me".equalsIgnoreCase(authorId.trim())) {
            return currentUser.requireUserId();
        }
        try {
            return UUID.fromString(authorId.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid authorId: " + authorId + ". Use 'me' or a valid UUID.");
        }
    }
}
