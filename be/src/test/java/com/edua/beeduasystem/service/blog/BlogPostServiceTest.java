package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
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
import static org.mockito.Mockito.*;

class BlogPostServiceTest {
    private BlogPostRepository posts;
    private BlogCommentRepository comments;
    private BlogAuthorResolver authors;
    private CurrentUserProvider currentUser;
    private BlogPostService service;
    private final BlogContentSanitizer sanitizer = new BlogContentSanitizer();

    @BeforeEach
    void setUp() {
        posts = mock(BlogPostRepository.class);
        comments = mock(BlogCommentRepository.class);
        authors = mock(BlogAuthorResolver.class);
        currentUser = mock(CurrentUserProvider.class);
        service = new BlogPostService(posts, comments, sanitizer, authors, currentUser);
        when(posts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void create_savesPublishedPostWithTrimmedTitleAndSanitizedContent() {
        UUID authorId = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(authorId);
        BlogViews.PostDetail result = service.create("  Algebra  ", "<p>Safe</p><script>alert(1)</script>", " math ");
        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(posts).save(saved.capture());
        assertThat(saved.getValue()).satisfies(post -> {
            assertThat(post.authorId()).isEqualTo(authorId);
            assertThat(post.title()).isEqualTo("Algebra");
            assertThat(post.content()).doesNotContain("script");
            assertThat(post.subject()).isEqualTo(Subject.MATH);
            assertThat(post.status()).isEqualTo(BlogPostStatus.PUBLISHED);
        });
        assertThat(result.title()).isEqualTo("Algebra");
    }

    @Test
    void create_rejectsMissingTitle() { assertThatThrownBy(() -> service.create(" ", "<p>x</p>", "MATH")).isInstanceOf(IllegalArgumentException.class); }

    @Test
    void create_rejectsContentThatIsEmptyAfterSanitizing() { assertThatThrownBy(() -> service.create("Title", "<script>x</script>", "MATH")).isInstanceOf(IllegalArgumentException.class); }

    @Test
    void create_rejectsMissingOrInvalidSubject() {
        assertThatThrownBy(() -> service.create("Title", "<p>x</p>", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create("Title", "<p>x</p>", "HISTORY")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void update_ownerCanChangeOnlyProvidedField() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(post.authorId());
        BlogViews.PostDetail result = service.update(post.id(), " New ", null, null);
        assertThat(result.title()).isEqualTo("New");
        ArgumentCaptor<BlogPost> saved = ArgumentCaptor.forClass(BlogPost.class);
        verify(posts).save(saved.capture());
        assertThat(saved.getValue()).satisfies(value -> {
            assertThat(value.content()).isEqualTo(post.content());
            assertThat(value.subject()).isEqualTo(post.subject());
            assertThat(value.createdAt()).isEqualTo(post.createdAt());
        });
    }

    @Test
    void update_rejectsNonOwnerAndMissingOrNonPublishedPost() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.update(post.id(), "x", null, null)).isInstanceOf(ForbiddenOperationException.class);
        when(posts.findPublishedById(UUID.randomUUID())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), "x", null, null)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_revalidatesProvidedContentAndSubject() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(post.authorId());
        assertThatThrownBy(() -> service.update(post.id(), null, "<script>x</script>", null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(post.id(), null, null, "UNKNOWN")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void delete_ownerSoftDeletesPublishedPost() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(post.authorId());
        service.delete(post.id());
        verify(posts).save(argThat(value -> value.status() == BlogPostStatus.DELETED_BY_AUTHOR && value.id().equals(post.id())));
    }

    @Test
    void delete_rejectsNonOwnerAndMissingPost() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.delete(post.id())).isInstanceOf(ForbiddenOperationException.class);
        assertThatThrownBy(() -> service.delete(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void removeByModerator_recordsTrimmedReasonAndModeratorForMatchingSubject() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        UUID moderatorId = UUID.randomUUID();
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.require()).thenReturn(new AccessTokenClaims(moderatorId, "m@edua.vn", Set.of(), Subject.MATH));
        when(currentUser.requireUserId()).thenReturn(moderatorId);
        service.removeByModerator(post.id(), "  Spam  ");
        verify(posts).save(argThat(value -> value.status() == BlogPostStatus.REMOVED_BY_MODERATOR
                && value.removedReason().equals("Spam") && value.removedBy().equals(moderatorId)));
    }

    @Test
    void removeByModerator_rejectsBlankReasonWrongOrMissingSubjectAndMissingPost() {
        assertThatThrownBy(() -> service.removeByModerator(UUID.randomUUID(), " ")).isInstanceOf(IllegalArgumentException.class);
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.require()).thenReturn(new AccessTokenClaims(UUID.randomUUID(), "m@edua.vn", Set.of(), Subject.PHYSICS));
        assertThatThrownBy(() -> service.removeByModerator(post.id(), "reason")).isInstanceOf(ForbiddenOperationException.class);
        when(currentUser.require()).thenReturn(new AccessTokenClaims(UUID.randomUUID(), "m@edua.vn", Set.of(), null));
        assertThatThrownBy(() -> service.removeByModerator(post.id(), "reason")).isInstanceOf(ForbiddenOperationException.class);
        assertThatThrownBy(() -> service.removeByModerator(UUID.randomUUID(), "reason")).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getDetail_returnsCommentsAndResolvedNamesOrNotFound() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        BlogComment comment = new BlogComment(UUID.randomUUID(), post.id(), UUID.randomUUID(), "Hi", Instant.now(), Instant.now());
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(comments.findByPostId(post.id())).thenReturn(List.of(comment));
        when(authors.name(any())).thenReturn("Teacher");
        assertThat(service.getDetail(post.id()).comments()).hasSize(1);
        assertThatThrownBy(() -> service.getDetail(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void list_passesFiltersAndBuildsSummaryMetadata() {
        BlogPost post = post(UUID.randomUUID(), UUID.randomUUID(), BlogPostStatus.PUBLISHED);
        when(posts.search(Subject.MATH, post.authorId(), "algebra", 1, 10))
                .thenReturn(new BlogPostRepository.SearchResult(List.of(post), 4));
        when(authors.names(any(), any())).thenReturn(java.util.Map.of(post.authorId(), "Teacher"));
        when(comments.countByPostId(post.id())).thenReturn(2L);
        BlogViews.Page<BlogViews.PostSummary> result = service.list(" math ", post.authorId(), "algebra", 1, 10);
        assertThat(result).satisfies(page -> { assertThat(page.total()).isEqualTo(4); assertThat(page.items().getFirst().excerpt()).isEqualTo("Body"); });
    }

    @Test
    void list_rejectsInvalidSubjectAndSupportsEmptyResult() {
        assertThatThrownBy(() -> service.list("invalid", null, null, 0, 10)).isInstanceOf(IllegalArgumentException.class);
        when(posts.search(null, null, null, 0, 10)).thenReturn(new BlogPostRepository.SearchResult(List.of(), 0));
        assertThat(service.list(null, null, null, 0, 10).items()).isEmpty();
    }

    private static BlogPost post(UUID id, UUID authorId, BlogPostStatus status) {
        Instant now = Instant.now();
        return new BlogPost(id, authorId, "Title", "<p>Body</p>", Subject.MATH, status, null, null, now, now);
    }
}
