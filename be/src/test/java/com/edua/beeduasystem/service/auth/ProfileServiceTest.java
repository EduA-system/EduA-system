package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProfileServiceTest {

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private ProfileService profileService;

    @BeforeEach
    void setup() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        profileService = new ProfileService(userRepository, userRoleRepository, currentUserProvider);
    }

    @Test
    void updateCurrentUserProfile_updatesEditableFieldsAndKeepsAccountFields() {
        UUID userId = UUID.randomUUID();
        Instant createdAt = Instant.now();
        Instant lastLoginAt = Instant.now();
        AppUser user = new AppUser(userId, "teacher@fpt.edu.vn", "sub-1", "Old Name",
                null, null, Subject.CHEMISTRY, UserStatus.ACTIVE, createdAt, lastLoginAt);

        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));

        ProfileService.ProfileResult result = profileService.updateCurrentUserProfile(
                "  New Name  ",
                " https://cdn.example.com/avatar.png ",
                "  0900000000  ",
                "  Short bio  ",
                "  0987654321  ");

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().fullName()).isEqualTo("New Name");
        assertThat(saved.getValue().avatarUrl()).isEqualTo("https://cdn.example.com/avatar.png");
        assertThat(saved.getValue().contactInfo()).isEqualTo("0900000000");
        assertThat(saved.getValue().bio()).isEqualTo("Short bio");
        assertThat(saved.getValue().phoneNumber()).isEqualTo("0987654321");
        assertThat(saved.getValue().email()).isEqualTo("teacher@fpt.edu.vn");
        assertThat(saved.getValue().subject()).isEqualTo(Subject.CHEMISTRY);
        assertThat(saved.getValue().status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(result.roles()).containsExactly(Role.TEACHER);
    }

    @Test
    void updateCurrentUserProfile_omittedFieldsKeepExistingValues() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser(userId, "teacher@fpt.edu.vn", "sub-1", "Old Name",
                "https://cdn.example.com/old.png", "old-contact",
                Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), null);

        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));

        ProfileService.ProfileResult result = profileService.updateCurrentUserProfile("New Name", null, null, null, null);

        assertThat(result.user().fullName()).isEqualTo("New Name");
        assertThat(result.user().avatarUrl()).isEqualTo("https://cdn.example.com/old.png");
        assertThat(result.user().contactInfo()).isEqualTo("old-contact");
        assertThat(result.user().bio()).isNull();
        assertThat(result.user().phoneNumber()).isNull();
    }

    @Test
    void updateCurrentUserProfile_invalidAvatarUrl_rejected() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser(userId, "teacher@fpt.edu.vn", "sub-1", "Old Name",
                null, null, Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), null);

        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> profileService.updateCurrentUserProfile(null, "javascript:alert(1)", null, null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("URL ảnh đại diện");
    }

    @Test
    void updateCurrentUserProfile_blankAvatarUrl_removesAvatar() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser(userId, "teacher@fpt.edu.vn", "sub-1", "Old Name",
                "https://cdn.example.com/old.png", null, Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), null);

        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));

        ProfileService.ProfileResult result = profileService.updateCurrentUserProfile(null, "", null, null, null);

        assertThat(result.user().avatarUrl()).isNull();
    }
}
