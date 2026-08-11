package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.exception.StateConflictException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.notification.NotificationService;
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
        service = new LibraryContentService(repository, currentUserProvider, mock(ActivityLogService.class), mock(NotificationService.class));
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private LibraryContent contentWithStatus(UUID id, LibraryContentStatus status, Instant submittedAt) {
        return contentWithStatus(id, ownerId, null, status, submittedAt);
    }

    private LibraryContent contentWithStatus(UUID id, UUID owner, Subject subject, LibraryContentStatus status, Instant submittedAt) {
        Instant now = Instant.now();
        return new LibraryContent(id, owner, LibraryContentType.LESSON_PLAN, "Bai giang", subject,
                status, JsonNodeFactory.instance.objectNode(), null, now, now, submittedAt, null, null, null, null);
    }

    @Test
    void submit_marksPrivateContentAsSubmittedAndStampsTimestamp() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.MATH, LibraryContentStatus.PRIVATE, null)));

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

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(StateConflictException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submit_throwsResourceNotFoundWhenContentMissing() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void submit_throwsWhenSubjectIsMissing() {
        // R1-01: content chưa được gán môn học phải bị chặn ngay khi gửi duyệt, không được
        // phép lọt vào SUBMITTED — nếu không sẽ kẹt vĩnh viễn (không moderator nào thấy trong
        // hàng chờ vì listModerationQueue() luôn lọc theo subject != null).
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(contentWithStatus(id, LibraryContentStatus.PRIVATE, null)));

        assertThatThrownBy(() -> service.submit(id)).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submit_throwsForbiddenWhenCallerIsNotOwner() {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        LibraryContent othersContent = new LibraryContent(id, UUID.randomUUID(), LibraryContentType.LESSON_PLAN,
                "Bai giang", null, LibraryContentStatus.PRIVATE, JsonNodeFactory.instance.objectNode(), null, now, now, null, null, null, null, null);
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

        assertThatThrownBy(() -> service.unsubmit(id)).isInstanceOf(StateConflictException.class);
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
                "Bai giang", null, LibraryContentStatus.SUBMITTED, JsonNodeFactory.instance.objectNode(), null, now, now, now, null, null, null, null);
        when(repository.findActiveById(id)).thenReturn(Optional.of(othersContent));

        assertThatThrownBy(() -> service.unsubmit(id)).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submit_allowsResubmissionFromRejected() {
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.PHYSICS, LibraryContentStatus.REJECTED, null)));

        LibraryViews.Detail result = service.submit(id);

        assertThat(result.status()).isEqualTo(LibraryContentStatus.SUBMITTED);
        assertThat(result.rejectionReason()).isNull();
    }

    @Test
    void approve_movesSubmittedContentToApprovedWhenModeratorSubjectMatches() {
        UUID id = UUID.randomUUID();
        UUID moderatorId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(moderatorId);
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(moderatorId, "mod@edua.vn", null, Subject.MATH));
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.MATH, LibraryContentStatus.SUBMITTED, Instant.now())));

        LibraryViews.Detail result = service.approve(id);

        ArgumentCaptor<LibraryContent> saved = ArgumentCaptor.forClass(LibraryContent.class);
        verify(repository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(LibraryContentStatus.APPROVED);
        assertThat(saved.getValue().reviewedBy()).isEqualTo(moderatorId);
        assertThat(result.status()).isEqualTo(LibraryContentStatus.APPROVED);
    }

    @Test
    void approve_throwsForbiddenWhenModeratorSubjectDoesNotMatchContent() {
        UUID id = UUID.randomUUID();
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(UUID.randomUUID(), "mod@edua.vn", null, Subject.PHYSICS));
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.MATH, LibraryContentStatus.SUBMITTED, Instant.now())));

        assertThatThrownBy(() -> service.approve(id)).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void reject_requiresNonBlankReasonAndStampsIt() {
        UUID id = UUID.randomUUID();
        UUID moderatorId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(moderatorId);
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(moderatorId, "mod@edua.vn", null, Subject.CHEMISTRY));
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.CHEMISTRY, LibraryContentStatus.SUBMITTED, Instant.now())));

        assertThatThrownBy(() -> service.reject(id, " ")).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());

        LibraryViews.Detail result = service.reject(id, "Thieu nguon tham khao");

        assertThat(result.status()).isEqualTo(LibraryContentStatus.REJECTED);
        assertThat(result.rejectionReason()).isEqualTo("Thieu nguon tham khao");
    }

    @Test
    void listModerationQueue_throwsForbiddenWhenModeratorHasNoSubject() {
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(UUID.randomUUID(), "mod@edua.vn", null, null));

        assertThatThrownBy(() -> service.listModerationQueue(0, 20)).isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void update_throwsWhenClearingSubjectWhileContentIsSubmitted() {
        // R1-01, đường vòng qua update(): một khi PATCH có thể xoá subject về null (R1-03), phải
        // chặn xoá trong lúc content đang SUBMITTED — nếu không sẽ tái tạo đúng lỗi "kẹt vĩnh
        // viễn" (không moderator nào thấy trong hàng chờ) qua một cửa khác thay vì qua submit().
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.MATH, LibraryContentStatus.SUBMITTED, Instant.now())));

        assertThatThrownBy(() -> service.update(id, null, null, true, null, false, null, false, null, false, null, false, null, false))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void update_allowsClearingSubjectWhileContentIsPrivate() {
        // Guard chỉ áp dụng khi đang SUBMITTED — nội dung riêng tư vẫn được sửa tự do.
        UUID id = UUID.randomUUID();
        when(repository.findActiveById(id)).thenReturn(Optional.of(
                contentWithStatus(id, ownerId, Subject.MATH, LibraryContentStatus.PRIVATE, null)));

        LibraryViews.Detail result = service.update(id, null, null, true, null, false, null, false, null, false, null, false, null, false);

        assertThat(result.subject()).isNull();
    }
}
