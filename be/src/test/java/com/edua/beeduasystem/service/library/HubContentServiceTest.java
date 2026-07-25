package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.HubCommentRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class HubContentServiceTest {

    private LibraryContentRepository repository;
    private HubCommentRepository commentRepository;
    private AppUserRepository userRepository;
    private CurrentUserProvider currentUserProvider;
    private HubContentService service;

    private final UUID ownerId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        repository = mock(LibraryContentRepository.class);
        commentRepository = mock(HubCommentRepository.class);
        userRepository = mock(AppUserRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new HubContentService(repository, commentRepository, userRepository, currentUserProvider);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(any())).thenReturn(Optional.empty());
    }

    private LibraryContent contentWithStatus(UUID id, LibraryContentStatus status) {
        Instant now = Instant.now();
        return new LibraryContent(id, ownerId, LibraryContentType.LESSON_PLAN, "Bai giang", null,
                status, JsonNodeFactory.instance.objectNode(), null, now, now, null, null, null, null, null);
    }

    @Test
    void get_throwsResourceNotFoundWhenContentIsNotApproved() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.SUBMITTED)));

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void get_throwsResourceNotFoundWhenContentMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void get_returnsDetailForApprovedContentWithoutOwnerCheck() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.APPROVED)));

        HubViews.ContentDetail result = service.get(id);

        assertThat(result.id()).isEqualTo(id);
    }

    @Test
    void customize_throwsWhenSourceContentIsNotApproved() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.PRIVATE)));

        assertThatThrownBy(() -> service.customize(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void customize_copiesApprovedContentAsPrivateOwnedByCurrentUser() {
        UUID id = UUID.randomUUID();
        UUID requesterId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(requesterId);
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.APPROVED)));

        LibraryViews.Detail result = service.customize(id);

        ArgumentCaptor<LibraryContent> saved = ArgumentCaptor.forClass(LibraryContent.class);
        org.mockito.Mockito.verify(repository).save(saved.capture());
        assertThat(saved.getValue().id()).isNotEqualTo(id);
        assertThat(saved.getValue().ownerId()).isEqualTo(requesterId);
        assertThat(saved.getValue().status()).isEqualTo(LibraryContentStatus.PRIVATE);
        assertThat(result.status()).isEqualTo(LibraryContentStatus.PRIVATE);
    }
}
