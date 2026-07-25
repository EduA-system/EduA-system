package com.edua.beeduasystem.service.weeklytask;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WeeklyTaskServiceTest {

    private WeeklyTaskRepository repository;
    private LibraryContentRepository libraryContentRepository;
    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private NotificationRepository notificationRepository;
    private NotificationStreamPort streamPort;
    private WeeklyTaskService service;

    private final UUID moderatorId = UUID.randomUUID();
    private final UUID teacherId = UUID.randomUUID();
    private final Instant futureDeadline = Instant.now().plusSeconds(3600);
    private final Instant pastDeadline = Instant.now().minusSeconds(3600);

    @BeforeEach
    void setup() {
        repository = mock(WeeklyTaskRepository.class);
        libraryContentRepository = mock(LibraryContentRepository.class);
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        notificationRepository = mock(NotificationRepository.class);
        streamPort = mock(NotificationStreamPort.class);
        service = new WeeklyTaskService(repository, libraryContentRepository, userRepository, userRoleRepository,
                currentUserProvider, notificationRepository, streamPort);

        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(notificationRepository.createWithRecipients(any(), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private WeeklyTask task(UUID id, WeeklyTaskReviewStatus status, Instant deadline, String rejectionReason) {
        Instant now = Instant.now();
        return new WeeklyTask(id, moderatorId, Subject.MATH, teacherId, LocalDate.now(), "Chuong 3", deadline, status,
                null, null, null, status == WeeklyTaskReviewStatus.SUBMITTED ? now : null, null, null,
                rejectionReason, now, now);
    }

    private void asModerator() {
        when(currentUserProvider.requireUserId()).thenReturn(moderatorId);
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(moderatorId, "mod@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));
    }

    private void asTeacher() {
        when(currentUserProvider.requireUserId()).thenReturn(teacherId);
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(teacherId, "teacher@edua.vn", Set.of(Role.TEACHER), Subject.MATH));
    }

    // ---- submit (UC-84) ----

    @Test
    void submit_fromNotSubmitted_succeedsWithLibraryContent() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        UUID lessonPlanId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));
        when(libraryContentRepository.findActiveById(lessonPlanId)).thenReturn(Optional.of(ownedLessonPlan(lessonPlanId)));

        WeeklyTaskViews.Detail result = service.submit(taskId, lessonPlanId, null, null);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.SUBMITTED);
        assertThat(result.sourceLibraryContentId()).isEqualTo(lessonPlanId);
        assertThat(result.submittedAt()).isNotNull();
    }

    @Test
    void submit_fromRejected_keepsRejectionReasonUntilNextDecision() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        UUID lessonPlanId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.REJECTED, futureDeadline, "Thieu muc tieu")));
        when(libraryContentRepository.findActiveById(lessonPlanId)).thenReturn(Optional.of(ownedLessonPlan(lessonPlanId)));

        WeeklyTaskViews.Detail result = service.submit(taskId, lessonPlanId, null, null);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.SUBMITTED);
        assertThat(result.rejectionReason()).isEqualTo("Thieu muc tieu");
    }

    @Test
    void submit_afterDeadline_throws() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, pastDeadline, null)));

        assertThatThrownBy(() -> service.submit(taskId, UUID.randomUUID(), null, null))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void submit_withBothSources_throws() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.submit(taskId, UUID.randomUUID(), "https://files/x.pdf", "x.pdf"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void submit_withNoSource_throws() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.submit(taskId, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void submit_withOthersLessonPlan_throwsForbidden() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        UUID lessonPlanId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));
        Instant now = Instant.now();
        LibraryContent othersContent = new LibraryContent(lessonPlanId, UUID.randomUUID(), LibraryContentType.LESSON_PLAN,
                "Bai giang", Subject.MATH, LibraryContentStatus.PRIVATE, JsonNodeFactory.instance.objectNode(), null, now, now, null, null, null, null, null);
        when(libraryContentRepository.findActiveById(lessonPlanId)).thenReturn(Optional.of(othersContent));

        assertThatThrownBy(() -> service.submit(taskId, lessonPlanId, null, null))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void submit_whenNotAssignedTeacher_throwsForbidden() {
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.submit(taskId, UUID.randomUUID(), null, null))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    // ---- unsubmit (UC-85) — the key behavior that deviates from LibraryContent ----

    @Test
    void unsubmit_freshSubmission_revertsToNotSubmitted() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, null)));

        WeeklyTaskViews.Detail result = service.unsubmit(taskId);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.NOT_SUBMITTED);
        assertThat(result.sourceLibraryContentId()).isNull();
    }

    @Test
    void unsubmit_afterPriorRejection_revertsToRejectedNotNotSubmitted() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, "Thieu muc tieu")));

        WeeklyTaskViews.Detail result = service.unsubmit(taskId);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.REJECTED);
        assertThat(result.rejectionReason()).isEqualTo("Thieu muc tieu");
    }

    @Test
    void unsubmit_onlyFromSubmitted_throws() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.unsubmit(taskId)).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void unsubmit_afterDeadline_throws() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, pastDeadline, null)));

        assertThatThrownBy(() -> service.unsubmit(taskId)).isInstanceOf(IllegalArgumentException.class);
    }

    // ---- approve / reject (UC-88/89) ----

    @Test
    void approve_onlyFromSubmittedInModeratorSubject_succeeds() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, null)));

        WeeklyTaskViews.Detail result = service.approve(taskId);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.APPROVED);
        assertThat(result.reviewedBy()).isEqualTo(moderatorId);
    }

    @Test
    void approve_wrongModeratorSubject_throwsForbidden() {
        when(currentUserProvider.requireUserId()).thenReturn(moderatorId);
        when(currentUserProvider.require()).thenReturn(new AccessTokenClaims(moderatorId, "mod@edua.vn", Set.of(Role.MODERATOR), Subject.PHYSICS));
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.approve(taskId)).isInstanceOf(ForbiddenOperationException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void approve_notSubmitted_throws() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.approve(taskId)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void reject_requiresNonBlankReason() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, null)));

        assertThatThrownBy(() -> service.reject(taskId, " ")).isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());

        WeeklyTaskViews.Detail result = service.reject(taskId, "Thieu nguon tham khao");
        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.REJECTED);
        assertThat(result.rejectionReason()).isEqualTo("Thieu nguon tham khao");
    }

    // ---- create / update (UC-81/82) ----

    @Test
    void create_rejectsInactiveTeacher() {
        asModerator();
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(appUser(teacherId, Subject.MATH, UserStatus.DISABLED)));

        assertThatThrownBy(() -> service.create(teacherId, LocalDate.now(), "Chuong 3", futureDeadline))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void create_rejectsTeacherFromAnotherSubject() {
        asModerator();
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(appUser(teacherId, Subject.PHYSICS, UserStatus.ACTIVE)));

        assertThatThrownBy(() -> service.create(teacherId, LocalDate.now(), "Chuong 3", futureDeadline))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void create_succeedsForActiveTeacherInSameSubject() {
        asModerator();
        when(userRepository.findById(teacherId)).thenReturn(Optional.of(appUser(teacherId, Subject.MATH, UserStatus.ACTIVE)));
        when(userRoleRepository.findRolesByUserId(teacherId)).thenReturn(Set.of(Role.TEACHER));

        WeeklyTaskViews.Detail result = service.create(teacherId, LocalDate.now(), "Chuong 3", futureDeadline);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.NOT_SUBMITTED);
        assertThat(result.teacherId()).isEqualTo(teacherId);
        verify(streamPort).publishNew(org.mockito.ArgumentMatchers.eq(teacherId), any());
    }

    @Test
    void update_afterDeadline_throws() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.NOT_SUBMITTED, pastDeadline, null)));

        assertThatThrownBy(() -> service.update(taskId, teacherId, LocalDate.now(), "Chuong 4", futureDeadline))
                .isInstanceOf(IllegalArgumentException.class);
        verify(repository, never()).save(any());
    }

    @Test
    void update_reassignment_resetsReviewStatusToNotSubmitted() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        UUID newTeacherId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.REJECTED, futureDeadline, "Thieu muc tieu")));
        when(userRepository.findById(newTeacherId)).thenReturn(Optional.of(appUser(newTeacherId, Subject.MATH, UserStatus.ACTIVE)));
        when(userRoleRepository.findRolesByUserId(newTeacherId)).thenReturn(Set.of(Role.TEACHER));

        WeeklyTaskViews.Detail result = service.update(taskId, newTeacherId, LocalDate.now(), "Chuong 4", futureDeadline);

        assertThat(result.teacherId()).isEqualTo(newTeacherId);
        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.NOT_SUBMITTED);
    }

    @Test
    void update_sameTeacher_keepsReviewStatus() {
        asModerator();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.of(task(taskId, WeeklyTaskReviewStatus.SUBMITTED, futureDeadline, null)));

        WeeklyTaskViews.Detail result = service.update(taskId, teacherId, LocalDate.now(), "Chuong 4 - cap nhat", futureDeadline);

        assertThat(result.reviewStatus()).isEqualTo(WeeklyTaskReviewStatus.SUBMITTED);
        assertThat(result.scopeDescription()).isEqualTo("Chuong 4 - cap nhat");
    }

    @Test
    void get_throwsResourceNotFoundWhenMissing() {
        asTeacher();
        UUID taskId = UUID.randomUUID();
        when(repository.findById(taskId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(taskId)).isInstanceOf(ResourceNotFoundException.class);
    }

    private LibraryContent ownedLessonPlan(UUID id) {
        Instant now = Instant.now();
        return new LibraryContent(id, teacherId, LibraryContentType.LESSON_PLAN, "Bai giang", Subject.MATH,
                LibraryContentStatus.PRIVATE, JsonNodeFactory.instance.objectNode(), null, now, now, null, null, null, null, null);
    }

    private AppUser appUser(UUID id, Subject subject, UserStatus status) {
        return new AppUser(id, "u@edua.vn", null, "Teacher Name", null, null, subject, status, Instant.now(), null);
    }
}
