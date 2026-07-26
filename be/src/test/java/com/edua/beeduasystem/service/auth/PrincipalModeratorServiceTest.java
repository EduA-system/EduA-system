package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;
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

class PrincipalModeratorServiceTest {

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private ActivityLogService activityLogService;
    private PrincipalModeratorService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        activityLogService = mock(ActivityLogService.class);
        service = new PrincipalModeratorService(userRepository, userRoleRepository, currentUserProvider,
                activityLogService);
    }

    @Test
    void replaceModerator_demotesPreviousToTeacherAndPromotesExistingTeacher() {
        AppUser previous = user("old@edua.vn", Subject.MATH, UserStatus.ACTIVE);
        AppUser replacement = user("new@edua.vn", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRepository.findByEmail(replacement.email())).thenReturn(Optional.of(replacement));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));
        when(userRoleRepository.findRolesByUserId(replacement.id())).thenReturn(Set.of(Role.TEACHER));
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.replaceModerator(previous.id(), replacement.email(), false);

        ArgumentCaptor<AppUser> savedUsers = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(2)).save(savedUsers.capture());
        assertThat(savedUsers.getAllValues().get(0).id()).isEqualTo(previous.id());
        assertThat(savedUsers.getAllValues().get(0).status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(result.id()).isEqualTo(replacement.id());
        verify(userRoleRepository).replaceRole(eq(previous.id()), eq(Role.TEACHER), any(), any());
        verify(userRoleRepository).replaceRole(eq(replacement.id()), eq(Role.MODERATOR), any(), any());
    }

    @Test
    void replaceModerator_disablesPreviousWhenRequested() {
        AppUser previous = user("old@edua.vn", Subject.PHYSICS, UserStatus.INVITED);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRepository.findByEmail("new@edua.vn")).thenReturn(Optional.empty());
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.replaceModerator(previous.id(), "new@edua.vn", true);

        ArgumentCaptor<AppUser> savedUsers = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository, times(2)).save(savedUsers.capture());
        assertThat(savedUsers.getAllValues().get(0).status()).isEqualTo(UserStatus.DISABLED);
        assertThat(savedUsers.getAllValues().get(1).status()).isEqualTo(UserStatus.INVITED);
    }

    @Test
    void replaceModerator_rejectsExistingAccountFromAnotherSubject() {
        AppUser previous = user("old@edua.vn", Subject.CHEMISTRY, UserStatus.ACTIVE);
        AppUser replacement = user("teacher@edua.vn", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRepository.findByEmail(replacement.email())).thenReturn(Optional.of(replacement));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), replacement.email(), false))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("cùng môn");
    }

    private AppUser user(String email, Subject subject, UserStatus status) {
        return new AppUser(UUID.randomUUID(), email, null, null, null, null,
                subject, status, Instant.now(), null);
    }
}
