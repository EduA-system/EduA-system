package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class LibraryContentServiceTest {
    private LibraryContentRepository repository;
    private CurrentUserProvider currentUser;
    private LibraryContentService service;

    @BeforeEach
    void setUp() {
        repository = mock(LibraryContentRepository.class);
        currentUser = mock(CurrentUserProvider.class);
        service = new LibraryContentService(repository, currentUser);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void list_passesFiltersAndNormalizesResponsePageAndSize() {
        UUID owner = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(owner);
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.search(owner, LibraryContentType.SLIDE_DECK, Subject.MATH, 10, "kinematics", -2, 200, true))
                .thenReturn(new LibraryContentRepository.SearchResult(List.of(item), 3));

        LibraryViews.Page result = service.list(" slide_deck ", " math ", 10, "kinematics", -2, 200, "title");

        assertThat(result).satisfies(page -> {
            assertThat(page.page()).isZero();
            assertThat(page.size()).isEqualTo(100);
            assertThat(page.total()).isEqualTo(3);
            assertThat(page.items()).hasSize(1);
        });
    }

    @Test
    void list_supportsEmptyFiltersAndDescendingSort() {
        UUID owner = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(owner);
        when(repository.search(owner, null, null, null, null, 0, 10, false))
                .thenReturn(new LibraryContentRepository.SearchResult(List.of(), 0));

        assertThat(service.list(null, null, null, null, 0, 10, "updated").items()).isEmpty();
    }

    @Test
    void list_rejectsInvalidTypeSubjectAndGrade() {
        assertThatThrownBy(() -> service.list("book", null, null, null, 0, 10, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(null, "biology", null, null, 0, 10, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.list(null, null, 9, null, 0, 10, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void get_returnsOwnedActiveContent() {
        UUID owner = UUID.randomUUID();
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(owner);

        assertThat(service.get(item.id())).satisfies(detail -> {
            assertThat(detail.id()).isEqualTo(item.id());
            assertThat(detail.payload()).isEqualTo(item.payload());
        });
    }

    @Test
    void get_rejectsMissingAndOtherOwners() {
        assertThatThrownBy(() -> service.get(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
        LibraryContent item = content(UUID.randomUUID(), UUID.randomUUID());
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.get(item.id())).isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void create_setsCurrentOwnerPrivateDefaultsAndCleansInputs() {
        UUID owner = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(owner);

        LibraryViews.Detail result = service.create(" lesson_plan ", "  Lesson  ", " physics ", 12, null, " https://cdn.example/x.png ");

        ArgumentCaptor<LibraryContent> saved = ArgumentCaptor.forClass(LibraryContent.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue()).satisfies(value -> {
            assertThat(value.ownerId()).isEqualTo(owner);
            assertThat(value.type()).isEqualTo(LibraryContentType.LESSON_PLAN);
            assertThat(value.title()).isEqualTo("Lesson");
            assertThat(value.subject()).isEqualTo(Subject.PHYSICS);
            assertThat(value.status()).isEqualTo(LibraryContentStatus.PRIVATE);
            assertThat(value.payload().isObject()).isTrue();
            assertThat(value.thumbnailUrl()).isEqualTo("https://cdn.example/x.png");
        });
        assertThat(result.title()).isEqualTo("Lesson");
    }

    @Test
    void create_rejectsMissingOrInvalidTypeAndBlankTitle() {
        assertThatThrownBy(() -> service.create(null, "Title", null, null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create("book", "Title", null, null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create("TEST", " ", null, null, null, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void create_rejectsInvalidSubjectAndGrade() {
        assertThatThrownBy(() -> service.create("TEST", "Title", "biology", null, null, null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create("TEST", "Title", null, 13, null, null)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void update_ownerChangesOnlyProvidedFieldsAndCanClearThumbnail() {
        UUID owner = UUID.randomUUID();
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(owner);
        JsonNode payload = JsonNodeFactory.instance.objectNode().put("slides", 4);

        service.update(item.id(), " New title ", "CHEMISTRY", true, 11, true, payload, true, " ", true);

        verify(repository).save(argThat(value -> value.title().equals("New title")
                && value.subject() == Subject.CHEMISTRY && value.grade() == 11
                && value.payload().equals(payload) && value.thumbnailUrl() == null
                && value.createdAt().equals(item.createdAt()) && value.deletedAt() == null));
    }

    @Test
    void update_preservesOmittedFieldsAndUsesEmptyObjectForProvidedNullPayload() {
        UUID owner = UUID.randomUUID();
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(owner);

        service.update(item.id(), null, null, false, null, false, null, true, null, false);

        verify(repository).save(argThat(value -> value.title().equals(item.title())
                && value.subject() == item.subject() && value.grade().equals(item.grade())
                && value.payload().isObject() && value.payload().isEmpty()));
    }

    @Test
    void update_rejectsInvalidTitleSubjectAndGrade() {
        UUID owner = UUID.randomUUID();
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(owner);
        assertThatThrownBy(() -> service.update(item.id(), " ", null, false, null, false, null, false, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(item.id(), null, "biology", true, null, false, null, false, null, false)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.update(item.id(), null, null, false, 9, true, null, false, null, false)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void update_rejectsMissingAndOtherOwners() {
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), null, null, false, null, false, null, false, null, false)).isInstanceOf(ResourceNotFoundException.class);
        LibraryContent item = content(UUID.randomUUID(), UUID.randomUUID());
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.update(item.id(), null, null, false, null, false, null, false, null, false)).isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void delete_ownerMarksDeletedAtButKeepsPrivateStatus() {
        UUID owner = UUID.randomUUID();
        LibraryContent item = content(UUID.randomUUID(), owner);
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(owner);

        service.delete(item.id());

        verify(repository).save(argThat(value -> value.status() == LibraryContentStatus.PRIVATE
                && value.deletedAt() != null && value.deletedAt().isAfter(item.createdAt())));
    }

    @Test
    void delete_rejectsMissingAndOtherOwnersWithoutSaving() {
        assertThatThrownBy(() -> service.delete(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
        LibraryContent item = content(UUID.randomUUID(), UUID.randomUUID());
        when(repository.findActiveById(item.id())).thenReturn(Optional.of(item));
        when(currentUser.requireUserId()).thenReturn(UUID.randomUUID());
        assertThatThrownBy(() -> service.delete(item.id())).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }

    private static LibraryContent content(UUID id, UUID ownerId) {
        Instant created = Instant.now().minusSeconds(5);
        return new LibraryContent(id, ownerId, LibraryContentType.TEST, "Original", Subject.MATH, 10,
                LibraryContentStatus.PRIVATE, JsonNodeFactory.instance.objectNode().put("version", 1),
                "https://cdn.example/original.png", created, created, null);
    }
}
