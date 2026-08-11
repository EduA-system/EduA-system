package com.edua.beeduasystem.service.notification;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private AppUserRepository userRepository;
    private CurrentUserProvider currentUser;
    private NotificationStreamPort streamPort;
    private NotificationService service;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        userRepository = mock(AppUserRepository.class);
        currentUser = mock(CurrentUserProvider.class);
        streamPort = mock(NotificationStreamPort.class);
        service = new NotificationService(notificationRepository, userRepository, currentUser, streamPort);
    }

    @Test
    void create_fansOutToTeachersOfSameSubjectAndPublishesToEach() {
        UUID moderatorId = UUID.randomUUID();
        when(currentUser.require()).thenReturn(new AccessTokenClaims(
                moderatorId, "mod@edua.vn", Set.of(Role.MODERATOR), Subject.CHEMISTRY));
        when(currentUser.requireUserId()).thenReturn(moderatorId);

        AppUser teacher1 = teacher("t1@edua.vn");
        AppUser teacher2 = teacher("t2@edua.vn");
        when(userRepository.findAllByRoleAndSubject(eq(Role.TEACHER), eq(Subject.CHEMISTRY), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(teacher1, teacher2)));
        when(userRepository.findById(moderatorId)).thenReturn(java.util.Optional.of(moderator(moderatorId)));

        when(notificationRepository.createWithRecipients(any(Notification.class), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        NotificationViews.NotificationCreated result = service.create("Nghỉ lễ", "Nghỉ ngày mai");

        assertThat(result.recipientCount()).isEqualTo(2);
        assertThat(result.subject()).isEqualTo(Subject.CHEMISTRY);
        assertThat(result.senderName()).isEqualTo("Mod Name");

        ArgumentCaptor<List<UUID>> recipientsCaptor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).createWithRecipients(any(Notification.class), recipientsCaptor.capture());
        assertThat(recipientsCaptor.getValue()).containsExactlyInAnyOrder(teacher1.id(), teacher2.id());

        verify(streamPort, times(2)).publishNew(any(UUID.class), any(NotificationEvent.class));
    }

    @Test
    void create_rejectsModeratorWithoutSubject() {
        when(currentUser.require()).thenReturn(new AccessTokenClaims(
                UUID.randomUUID(), "mod@edua.vn", Set.of(Role.MODERATOR), null));

        assertThatThrownBy(() -> service.create("Tiêu đề", "Nội dung"))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void create_rejectsBlankTitle() {
        when(currentUser.require()).thenReturn(new AccessTokenClaims(
                UUID.randomUUID(), "mod@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));

        assertThatThrownBy(() -> service.create("  ", "Nội dung"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void markRead_throwsNotFoundWhenRecipientRowMissing() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(userId);
        when(notificationRepository.markRead(notificationId, userId)).thenReturn(false);

        assertThatThrownBy(() -> service.markRead(notificationId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void markRead_succeedsWhenRecipientRowExists() {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(userId);
        when(notificationRepository.markRead(notificationId, userId)).thenReturn(true);

        service.markRead(notificationId);

        verify(notificationRepository).markRead(notificationId, userId);
    }

    private AppUser teacher(String email) {
        return new AppUser(UUID.randomUUID(), email, null, null, null, null,
                null, null, Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), null, null);
    }

    private AppUser moderator(UUID id) {
        return new AppUser(id, "mod@edua.vn", null, "Mod Name", null, null,
                null, null, Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), null, null);
    }
}
