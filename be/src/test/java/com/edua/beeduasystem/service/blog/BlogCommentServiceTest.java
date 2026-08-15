package com.edua.beeduasystem.service.blog;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.blog.BlogComment;
import com.edua.beeduasystem.domain.model.blog.BlogPost;
import com.edua.beeduasystem.domain.model.blog.BlogPostStatus;
import com.edua.beeduasystem.repository.repositories.BlogCommentRepository;
import com.edua.beeduasystem.repository.repositories.BlogPostRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.notification.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BlogCommentServiceTest {

    private final UUID postId = UUID.randomUUID();
    private final UUID postAuthorId = UUID.randomUUID();
    private final UUID commentAuthorId = UUID.randomUUID();
    private final UUID commentId = UUID.randomUUID();

    private BlogCommentRepository commentRepository;
    private CurrentUserProvider currentUser;
    private BlogCommentService service;

    @BeforeEach
    void setup() {
        commentRepository = mock(BlogCommentRepository.class);
        BlogPostRepository postRepository = mock(BlogPostRepository.class);
        currentUser = mock(CurrentUserProvider.class);
        service = new BlogCommentService(commentRepository, postRepository, new BlogContentSanitizer(),
                mock(BlogAuthorResolver.class), currentUser, mock(NotificationService.class));

        BlogPost post = new BlogPost(postId, postAuthorId, "Bài viết", "<p>Nội dung</p>", null, null,
                BlogPostStatus.PUBLISHED, null, null, Instant.now(), Instant.now());
        when(postRepository.findPublishedById(postId)).thenReturn(Optional.of(post));
    }

    @Test
    void delete_hardDeletesOwnComment() {
        BlogComment comment = comment(commentId, commentAuthorId, null);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(currentUser.requireUserId()).thenReturn(commentAuthorId);

        service.delete(commentId);

        verify(commentRepository).deleteById(commentId);
        verify(commentRepository, never()).save(any());
    }

    @Test
    void hideRootComment_hidesItsDirectReplies() {
        UUID replyId = UUID.randomUUID();
        BlogComment root = comment(commentId, commentAuthorId, null);
        BlogComment reply = comment(replyId, UUID.randomUUID(), commentId);
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(root));
        when(commentRepository.findByPostId(postId)).thenReturn(List.of(root, reply));
        when(currentUser.requireUserId()).thenReturn(postAuthorId);

        service.hideByPostAuthor(commentId);

        verify(commentRepository, times(2)).save(any(BlogComment.class));
        verify(commentRepository).save(org.mockito.ArgumentMatchers.argThat(saved -> replyId.equals(saved.id()) && saved.hiddenAt() != null));
    }

    @Test
    void create_rejectsMoreThan200Words() {
        when(currentUser.requireUserId()).thenReturn(commentAuthorId);
        String content = String.join(" ", java.util.Collections.nCopies(201, "từ"));

        assertThatThrownBy(() -> service.create(postId, content, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("200 words");
    }

    @Test
    void delete_deniesAnotherUser() {
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment(commentId, commentAuthorId, null)));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> service.delete(commentId)).isInstanceOf(ForbiddenOperationException.class);
        verify(commentRepository, never()).deleteById(commentId);
    }

    private BlogComment comment(UUID id, UUID authorId, UUID parentCommentId) {
        Instant now = Instant.now();
        return new BlogComment(id, postId, authorId, parentCommentId, "<p>Bình luận</p>", now, now, null, null);
    }
}
