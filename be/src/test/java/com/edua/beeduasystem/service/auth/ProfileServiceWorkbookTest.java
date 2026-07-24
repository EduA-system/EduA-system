package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ProfileServiceWorkbookTest {

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private ProfileService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new ProfileService(userRepository, userRoleRepository, currentUserProvider);
    }

    @Test
    void utcUpd03_blankPatchValuesClearProfileFields() {
        UUID userId = UUID.randomUUID();
        AppUser existing = user(userId, "Old Name", "https://cdn.edua.vn/old.png", "old-contact");
        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(existing));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));

        ProfileService.ProfileResult result = service.updateCurrentUserProfile(" ", " ", " ");

        assertThat(result.user().fullName()).isNull();
        assertThat(result.user().avatarUrl()).isNull();
        assertThat(result.user().contactInfo()).isNull();
        assertThat(result.roles()).containsExactly(Role.TEACHER);
    }

    @Test
    void utcUpd04_ftpAvatarUrlRejected() {
        UUID userId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(userId, "Teacher", null, "contact")));

        assertThatThrownBy(() -> service.updateCurrentUserProfile("Teacher", "ftp://cdn.edua.vn/avatar.png", "email@edua.vn"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void utcUpd05_malformedAvatarUrlRejected() {
        UUID userId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(userId, "Teacher", null, "contact")));

        assertThatThrownBy(() -> service.updateCurrentUserProfile("Teacher", "not-a-url", "email@edua.vn"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void utcUpd06_missingCurrentUserRecordRejected() {
        UUID userId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateCurrentUserProfile("Teacher", null, null))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void utcUpd07_unauthenticatedRequestRejected() {
        when(currentUserProvider.requireUserId()).thenThrow(new InvalidTokenException("Not authenticated."));

        assertThatThrownBy(() -> service.updateCurrentUserProfile("Teacher", null, null))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("Not authenticated");

        verifyNoInteractions(userRepository, userRoleRepository);
    }

    private AppUser user(UUID id, String fullName, String avatarUrl, String contactInfo) {
        return new AppUser(id, "teacher@edua.vn", "sub-1", fullName, avatarUrl, contactInfo,
                Subject.MATH, UserStatus.ACTIVE, Instant.now(), null);
    }
}
