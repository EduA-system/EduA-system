package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.library.HubComment;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import com.edua.beeduasystem.service.notification.NotificationService;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Delete permission matrix: comment author, content owner, or a stranger (must be denied). */
class HubCommentServiceTest {

    private HubCommentRepository commentRepository;
    private LibraryContentRepository contentRepository;
    private AppUserRepository userRepository;
    private CurrentUserProvider currentUserProvider;
    private HubCommentService service;

    private final UUID contentOwnerId = UUID.randomUUID();
    private final UUID commentAuthorId = UUID.randomUUID();
    private final UUID contentId = UUID.randomUUID();
    private final UUID commentId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        commentRepository = mock(HubCommentRepository.class);
        contentRepository = mock(LibraryContentRepository.class);
        userRepository = mock(AppUserRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new HubCommentService(commentRepository, contentRepository, userRepository, new BlogContentSanitizer(), currentUserProvider, mock(NotificationService.class));

        HubComment comment = new HubComment(commentId, contentId, commentAuthorId, "Rat huu ich", Instant.now(), Instant.now());
        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));

        Instant now = Instant.now();
        LibraryContent content = new LibraryContent(contentId, contentOwnerId, LibraryContentType.LESSON_PLAN, "Bai giang", null,
                LibraryContentStatus.APPROVED, JsonNodeFactory.instance.objectNode(), null, now, now, null, null, null, null, null);
        when(contentRepository.findActiveById(contentId)).thenReturn(Optional.of(content));
    }

    @Test
    void delete_allowsCommentAuthor() {
        when(currentUserProvider.requireUserId()).thenReturn(commentAuthorId);

        service.delete(commentId);

        verify(commentRepository).deleteById(commentId);
    }

    @Test
    void delete_deniesContentOwnerEvenIfNotCommentAuthor() {
        when(currentUserProvider.requireUserId()).thenReturn(contentOwnerId);

        assertThatThrownBy(() -> service.delete(commentId)).isInstanceOf(ForbiddenOperationException.class);
        verify(commentRepository, never()).deleteById(any());
    }

    @Test
    void delete_deniesUnrelatedUser() {
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> service.delete(commentId)).isInstanceOf(ForbiddenOperationException.class);
        verify(commentRepository, never()).deleteById(any());
    }

    @Test
    void create_throwsWhenContentIsNotApproved() {
        Instant now = Instant.now();
        LibraryContent notApproved = new LibraryContent(contentId, contentOwnerId, LibraryContentType.LESSON_PLAN, "Bai giang", null,
                LibraryContentStatus.SUBMITTED, JsonNodeFactory.instance.objectNode(), null, now, now, now, null, null, null, null);
        when(contentRepository.findActiveById(contentId)).thenReturn(Optional.of(notApproved));
        when(currentUserProvider.requireUserId()).thenReturn(commentAuthorId);

        assertThatThrownBy(() -> service.create(contentId, "Binh luan")).isInstanceOf(ResourceNotFoundException.class);
    }
}
