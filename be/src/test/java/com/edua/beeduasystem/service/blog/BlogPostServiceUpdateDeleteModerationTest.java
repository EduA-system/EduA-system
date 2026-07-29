package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BlogPostServiceUpdateDeleteModerationTest {

    private static final UUID AUTHOR_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER_AUTHOR_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID MODERATOR_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID POST_ID = UUID.fromString("44444444-4444-4444-4444-444444444444");

    private BlogPostRepository postRepository;
    private BlogCommentRepository commentRepository;
    private BlogAuthorResolver authorResolver;
    private CurrentUserProvider currentUser;
    private ActivityLogService activityLogService;
    private BlogPostService service;

    @BeforeEach
    void setUp() {
        postRepository = mock(BlogPostRepository.class);
        commentRepository = mock(BlogCommentRepository.class);
        authorResolver = mock(BlogAuthorResolver.class);
        currentUser = mock(CurrentUserProvider.class);
        activityLogService = mock(ActivityLogService.class);
        service = new BlogPostService(postRepository, commentRepository, new BlogContentSanitizer(), authorResolver, currentUser, activityLogService);

        when(commentRepository.findByPostId(any(UUID.class))).thenReturn(List.of());
        when(authorResolver.name(AUTHOR_ID)).thenReturn("Vu Nhat Minh");
    }

    @Test
    void utcUbp01_ownerUpdatesTitleContentAndSubject() {
        BlogPost original = post(AUTHOR_ID, "Old title", "<p>Old content</p>", Subject.PHYSICS);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));
        when(postRepository.save(any(BlogPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BlogViews.PostDetail result = service.update(POST_ID, " New title ", "<p>New content</p>", " math ");

        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().title()).isEqualTo("New title");
        assertThat(saved.getValue().content()).isEqualTo("<p>New content</p>");
        assertThat(saved.getValue().subject()).isEqualTo(Subject.MATH);
        assertThat(saved.getValue().status()).isEqualTo(BlogPostStatus.PUBLISHED);
        assertThat(saved.getValue().updatedAt()).isAfterOrEqualTo(original.updatedAt());
        assertThat(result.title()).isEqualTo("New title");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
    }

    @Test
    void utcUbp02_nullUpdateFieldsKeepExistingTitleAndSubject() {
        BlogPost original = post(AUTHOR_ID, "Original title", "<p>Old content</p>", Subject.CHEMISTRY);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));
        when(postRepository.save(any(BlogPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BlogViews.PostDetail result = service.update(POST_ID, null, "<p>New content</p>", null);

        assertThat(result.title()).isEqualTo("Original title");
        assertThat(result.content()).isEqualTo("<p>New content</p>");
        assertThat(result.subject()).isEqualTo(Subject.CHEMISTRY);
    }

    @Test
    void utcUbp03_missingPublishedPostRejected() {
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(POST_ID, "Title", "<p>Content</p>", "MATH"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Blog post not found");
    }

    @Test
    void utcUbp04_nonOwnerUpdateRejected() {
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID))
                .thenReturn(Optional.of(post(OTHER_AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH)));

        assertThatThrownBy(() -> service.update(POST_ID, "Title", "<p>Content</p>", "MATH"))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(postRepository, never()).save(any());
    }

    @Test
    void utcUbp05_invalidTitleOrContentRejected() {
        BlogPost original = post(AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.update(POST_ID, " ", "<p>Content</p>", "MATH"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Title is required");
        assertThatThrownBy(() -> service.update(POST_ID, "Title", "<script>alert(1)</script>", "MATH"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Content is required");
    }

    @Test
    void utcUbp06_invalidSubjectRejected() {
        BlogPost original = post(AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.update(POST_ID, "Title", "<p>Content</p>", "HISTORY"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid subject: HISTORY");
    }

    @Test
    void utcUbp07_acceptsUpdatedTitleAt255Characters() {
        BlogPost original = post(AUTHOR_ID, "Original title", "<p>Old content</p>", Subject.MATH);
        String title = "T".repeat(255);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));
        when(postRepository.save(any(BlogPost.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BlogViews.PostDetail result = service.update(
                POST_ID, title, "<p>Nội dung hợp lệ.</p>", "MATH");

        assertThat(result.title()).isEqualTo(title);
        assertThat(result.title()).hasSize(255);
        assertThat(result.subject()).isEqualTo(Subject.MATH);
    }

    @Test
    void utcUbp08_rejectsUpdatedTitleOver255Characters() {
        BlogPost original = post(AUTHOR_ID, "Original title", "<p>Old content</p>", Subject.MATH);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.update(
                POST_ID, "T".repeat(256), "<p>Nội dung hợp lệ.</p>", "MATH"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Title must not exceed 255 characters.");

        verify(postRepository, never()).save(any());
    }

    @Test
    void utcDbp01_ownerSoftDeletesBlogPost() {
        BlogPost original = post(AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH);
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        service.delete(POST_ID);

        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().id()).isEqualTo(POST_ID);
        assertThat(saved.getValue().authorId()).isEqualTo(AUTHOR_ID);
        assertThat(saved.getValue().title()).isEqualTo("Title");
        assertThat(saved.getValue().status()).isEqualTo(BlogPostStatus.DELETED_BY_AUTHOR);
        assertThat(saved.getValue().removedReason()).isNull();
        assertThat(saved.getValue().removedBy()).isNull();
    }

    @Test
    void utcDbp02_missingBlogPostRejectedOnDelete() {
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(POST_ID))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcDbp03_alreadyDeletedOrRemovedPostIsNotPublished() {
        // findPublishedById filters both DELETED_BY_AUTHOR and REMOVED_BY_MODERATOR.
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(POST_ID))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Blog post not found");

        verify(postRepository, never()).save(any());
    }

    @Test
    void utcDbp04_nonOwnerDeleteRejected() {
        when(currentUser.requireUserId()).thenReturn(AUTHOR_ID);
        when(postRepository.findPublishedById(POST_ID))
                .thenReturn(Optional.of(post(OTHER_AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH)));

        assertThatThrownBy(() -> service.delete(POST_ID))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(postRepository, never()).save(any());
    }

    @Test
    void utcRmb01_moderatorRemovesPostInAssignedSubject() {
        BlogPost original = post(OTHER_AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH);
        when(currentUser.require()).thenReturn(
                new AccessTokenClaims(MODERATOR_ID, "moderator@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));
        when(currentUser.requireUserId()).thenReturn(MODERATOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        service.removeByModerator(POST_ID, "Violation reason");

        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(BlogPostStatus.REMOVED_BY_MODERATOR);
        assertThat(saved.getValue().removedReason()).isEqualTo("Violation reason");
        assertThat(saved.getValue().removedBy()).isEqualTo(MODERATOR_ID);
        assertThat(saved.getValue().title()).isEqualTo(original.title());
        assertThat(saved.getValue().content()).isEqualTo(original.content());
    }

    @Test
    void utcRmb02_missingBlogPostRejectedForModeratorRemoval() {
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.removeByModerator(POST_ID, "Violation"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRmb03_differentSubjectModeratorRejected() {
        BlogPost original = post(OTHER_AUTHOR_ID, "Title", "<p>Content</p>", Subject.PHYSICS);
        when(currentUser.require()).thenReturn(
                new AccessTokenClaims(MODERATOR_ID, "moderator@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        assertThatThrownBy(() -> service.removeByModerator(POST_ID, "Violation"))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("assigned subject");

        verify(postRepository, never()).save(any());
    }

    @Test
    void utcRmb04_blankRemovalReasonRejected() {
        assertThatThrownBy(() -> service.removeByModerator(POST_ID, " "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Removal reason is required");

        verify(postRepository, never()).findPublishedById(any());
    }

    @Test
    void utcRmb05_trimsReasonWhenModeratorRemovesPost() {
        BlogPost original = post(OTHER_AUTHOR_ID, "Title", "<p>Content</p>", Subject.MATH);
        when(currentUser.require()).thenReturn(
                new AccessTokenClaims(MODERATOR_ID, "moderator@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));
        when(currentUser.requireUserId()).thenReturn(MODERATOR_ID);
        when(postRepository.findPublishedById(POST_ID)).thenReturn(Optional.of(original));

        service.removeByModerator(POST_ID, "  Violation reason  ");

        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(postRepository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(BlogPostStatus.REMOVED_BY_MODERATOR);
        assertThat(saved.getValue().removedReason()).isEqualTo("Violation reason");
        assertThat(saved.getValue().removedBy()).isEqualTo(MODERATOR_ID);
    }

    private BlogPost post(UUID authorId, String title, String content, Subject subject) {
        Instant createdAt = Instant.now().minusSeconds(60);
        return new BlogPost(POST_ID, authorId, title, content, subject,
                BlogPostStatus.PUBLISHED, null, null, createdAt, createdAt);
    }
}
