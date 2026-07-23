package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BlogCommentServiceTest {
    private BlogCommentRepository comments;
    private BlogPostRepository posts;
    private BlogAuthorResolver authors;
    private CurrentUserProvider currentUser;
    private BlogCommentService service;

    @BeforeEach
    void setUp() {
        comments = mock(BlogCommentRepository.class);
        posts = mock(BlogPostRepository.class);
        authors = mock(BlogAuthorResolver.class);
        currentUser = mock(CurrentUserProvider.class);
        service = new BlogCommentService(comments, posts, new BlogContentSanitizer(), authors, currentUser);
        when(comments.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void create_savesSanitizedCommentForPublishedPost() {
        BlogPost post = post(); UUID authorId = UUID.randomUUID();
        when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(authorId);
        BlogViews.CommentView result = service.create(post.id(), "<p>Hello</p><script>x</script>");
        verify(comments).save(argThat(comment -> comment.postId().equals(post.id()) && comment.authorId().equals(authorId)
                && comment.content().contains("Hello") && !comment.content().contains("script")));
        assertThat(result.content()).contains("Hello");
    }

    @Test
    void create_rejectsMissingOrUnpublishedPostAndEmptyContent() {
        UUID id = UUID.randomUUID();
        when(posts.findPublishedById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(id, "<p>x</p>")).isInstanceOf(ResourceNotFoundException.class);
        BlogPost post = post(); when(posts.findPublishedById(post.id())).thenReturn(Optional.of(post));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.create(post.id(), "<script>x</script>")).isInstanceOf(IllegalArgumentException.class);
        verify(comments, never()).save(any());
    }

    @Test
    void update_ownerKeepsCreatedAtAndChangesContent() {
        BlogComment comment = comment(UUID.randomUUID());
        when(comments.findById(comment.id())).thenReturn(Optional.of(comment));
        when(currentUser.requireUserId()).thenReturn(comment.authorId());
        BlogViews.CommentView result = service.update(comment.id(), "<b>Edited</b>");
        verify(comments).save(argThat(value -> value.createdAt().equals(comment.createdAt()) && value.content().contains("Edited")
                && value.updatedAt().isAfter(comment.createdAt())));
        assertThat(result.content()).contains("Edited");
    }

    @Test
    void update_rejectsMissingNonOwnerAndEmptyContent() {
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), "x")).isInstanceOf(ResourceNotFoundException.class);
        BlogComment comment = comment(UUID.randomUUID());
        when(comments.findById(comment.id())).thenReturn(Optional.of(comment));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.update(comment.id(), "x")).isInstanceOf(ForbiddenOperationException.class);
        when(currentUser.requireUserId()).thenReturn(comment.authorId());
        assertThatThrownBy(() -> service.update(comment.id(), " ")).isInstanceOf(IllegalArgumentException.class);
        verify(comments, never()).save(any());
    }

    @Test
    void delete_ownerHardDeletesComment() {
        BlogComment comment = comment(UUID.randomUUID());
        when(comments.findById(comment.id())).thenReturn(Optional.of(comment));
        when(currentUser.requireUserId()).thenReturn(comment.authorId());
        service.delete(comment.id());
        verify(comments).deleteById(comment.id());
    }

    @Test
    void delete_rejectsMissingAndNonOwnerWithoutDeleting() {
        assertThatThrownBy(() -> service.delete(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
        BlogComment comment = comment(UUID.randomUUID());
        when(comments.findById(comment.id())).thenReturn(Optional.of(comment));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.delete(comment.id())).isInstanceOf(ForbiddenOperationException.class);
        verify(comments, never()).deleteById(any());
    }

    private static BlogPost post() { Instant now = Instant.now(); return new BlogPost(UUID.randomUUID(), UUID.randomUUID(), "Title", "<p>Body</p>", Subject.MATH, BlogPostStatus.PUBLISHED, null, null, now, now); }
    private static BlogComment comment(UUID id) { Instant created = Instant.now().minusSeconds(2); return new BlogComment(id, UUID.randomUUID(), UUID.randomUUID(), "Original", created, created); }
}
