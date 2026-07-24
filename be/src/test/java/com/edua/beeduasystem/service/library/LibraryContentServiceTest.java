package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LibraryContentServiceTest {

    private LibraryContentRepository repository;
    private CurrentUserProvider currentUserProvider;
    private LibraryContentService service;

    private final UUID ownerId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        repository = mock(LibraryContentRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new LibraryContentService(repository, currentUserProvider);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private LibraryContent contentWithStatus(UUID id, LibraryContentStatus status, Instant submittedAt) {
        Instant now = Instant.now();
        return new LibraryContent(id, ownerId, LibraryContentType.LESSON_PLAN, "Bai giang", null,
                status, JsonNodeFactory.instance.objectNode(), null, now, now, submittedAt, null);
    }

    @Test
    void submit_marksPrivateContentAsSubmittedAndStampsTimestamp() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.PRIVATE, null)));

        LibraryViews.Detail result = service.submit(id);

        ArgumentCaptor<LibraryContent> saved = ArgumentCaptor.forClass(LibraryContent.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(LibraryContentStatus.SUBMITTED);
        assertThat(saved.getValue().submittedAt()).isNotNull();
        assertThat(result.status()).isEqualTo(LibraryContentStatus.SUBMITTED);
        assertThat(result.submittedAt()).isNotNull();
    }

    @Test
    void submit_throwsWhenContentAlreadySubmitted() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.SUBMITTED, Instant.now())));

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submit_throwsResourceNotFoundWhenContentMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void submit_throwsForbiddenWhenCallerIsNotOwner() {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        LibraryContent othersContent = new LibraryContent(id, UUID.randomUUID(), LibraryContentType.LESSON_PLAN,
                "Bai giang", null, LibraryContentStatus.PRIVATE, JsonNodeFactory.instance.objectNode(), null, now, now, null, null);
        when(repository.findActiveById(id)).thenReturn(Optional.of(othersContent));

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void unsubmit_returnsSubmittedContentToPrivateAndClearsTimestamp() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.SUBMITTED, Instant.now())));

        LibraryViews.Detail result = service.unsubmit(id);

        ArgumentCaptor<LibraryContent> saved = ArgumentCaptor.forClass(LibraryContent.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(LibraryContentStatus.PRIVATE);
        assertThat(saved.getValue().submittedAt()).isNull();
        assertThat(result.status()).isEqualTo(LibraryContentStatus.PRIVATE);
        assertThat(result.submittedAt()).isNull();
    }

    @Test
    void unsubmit_throwsWhenContentIsAlreadyPrivate() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.PRIVATE, null)));

        assertThatThrownBy(() -> service.unsubmit(id)).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void unsubmit_throwsResourceNotFoundWhenContentMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.unsubmit(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void unsubmit_throwsForbiddenWhenCallerIsNotOwner() {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        LibraryContent othersContent = new LibraryContent(id, UUID.randomUUID(), LibraryContentType.LESSON_PLAN,
                "Bai giang", null, LibraryContentStatus.SUBMITTED, JsonNodeFactory.instance.objectNode(), null, now, now, now, null);
        when(repository.findActiveById(id)).thenReturn(Optional.of(othersContent));

        assertThatThrownBy(() -> service.unsubmit(id)).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }
}
