package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.library.CreateHubCommentRequest;
import com.edua.beeduasystem.presentation.dto.library.CreateHubReportRequest;
import com.edua.beeduasystem.presentation.dto.library.UpdateHubCommentRequest;
import com.edua.beeduasystem.service.library.HubCommentService;
import com.edua.beeduasystem.service.library.HubContentReportService;
import com.edua.beeduasystem.service.library.HubContentService;
import com.edua.beeduasystem.service.library.HubViews;
import com.edua.beeduasystem.service.library.LibraryViews;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Community Hub công khai: xem feed/chi tiết content đã duyệt (kể cả guest — xem SecurityConfig,
 * GET /api/hub/contents/** là permitAll), tùy biến/bình luận/báo cáo yêu cầu đăng nhập.
 */
@RestController
@RequestMapping("/api/hub")
public class HubContentController {

    private final HubContentService contentService;
    private final HubCommentService commentService;
    private final HubContentReportService reportService;

    public HubContentController(HubContentService contentService, HubCommentService commentService, HubContentReportService reportService) {
        this.contentService = contentService;
        this.commentService = commentService;
        this.reportService = reportService;
    }

    @GetMapping("/contents")
    public HubViews.Page<HubViews.ContentSummary> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return contentService.list(type, subject, q, page, size);
    }

    @GetMapping("/contents/{id}")
    public HubViews.ContentDetail get(@PathVariable UUID id) {
        return contentService.get(id);
    }

    @PostMapping("/contents/{id}/customize")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public LibraryViews.Detail customize(@PathVariable UUID id) {
        return contentService.customize(id);
    }

    @PostMapping("/contents/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public HubViews.CommentView createComment(@PathVariable UUID id, @RequestBody CreateHubCommentRequest request) {
        return commentService.create(id, request.content(), request.parentCommentId());
    }

    @PatchMapping("/comments/{commentId}")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public HubViews.CommentView updateComment(@PathVariable UUID commentId, @RequestBody UpdateHubCommentRequest request) {
        return commentService.update(commentId, request.content());
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public void deleteComment(@PathVariable UUID commentId) {
        commentService.delete(commentId);
    }

    @PostMapping("/comments/{commentId}/hide")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public void hideComment(@PathVariable UUID commentId) {
        commentService.hideByContentOwner(commentId);
    }

    @PostMapping("/contents/{id}/reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    public void report(@PathVariable UUID id, @RequestBody CreateHubReportRequest request) {
        reportService.create(id, request.reason());
    }
}
