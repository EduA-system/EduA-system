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

    @Test
    void utcUpd08_fullNameAt255CharactersIsAccepted() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);
        String fullName = "n".repeat(255);

        ProfileService.ProfileResult result =
                service.updateCurrentUserProfile(fullName, null, null);

        assertThat(result.user().fullName()).isEqualTo(fullName);
        assertThat(result.user().fullName()).hasSize(255);
    }

    @Test
    void utcUpd09_fullNameOver255CharactersIsRejected() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);

        assertThatThrownBy(() -> service.updateCurrentUserProfile("n".repeat(256), null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Full name must not exceed 255 characters.");
    }

    @Test
    void utcUpd10_avatarUrlAt1024CharactersIsAccepted() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);
        String prefix = "https://cdn.edua.vn/";
        String avatarUrl = prefix + "a".repeat(1024 - prefix.length());

        ProfileService.ProfileResult result =
                service.updateCurrentUserProfile(null, avatarUrl, null);

        assertThat(result.user().avatarUrl()).isEqualTo(avatarUrl);
        assertThat(result.user().avatarUrl()).hasSize(1024);
    }

    @Test
    void utcUpd11_avatarUrlOver1024CharactersIsRejected() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);
        String prefix = "https://cdn.edua.vn/";
        String avatarUrl = prefix + "a".repeat(1025 - prefix.length());

        assertThatThrownBy(() -> service.updateCurrentUserProfile(null, avatarUrl, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Avatar URL must not exceed 1024 characters.");
    }

    @Test
    void utcUpd12_contactInfoAt500CharactersIsAccepted() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);
        String contactInfo = "c".repeat(500);

        ProfileService.ProfileResult result =
                service.updateCurrentUserProfile(null, null, contactInfo);

        assertThat(result.user().contactInfo()).isEqualTo(contactInfo);
        assertThat(result.user().contactInfo()).hasSize(500);
    }

    @Test
    void utcUpd13_contactInfoOver500CharactersIsRejected() {
        UUID userId = UUID.randomUUID();
        stubExistingUser(userId);

        assertThatThrownBy(() -> service.updateCurrentUserProfile(null, null, "c".repeat(501)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Contact info must not exceed 500 characters.");
    }

    private void stubExistingUser(UUID userId) {
        when(currentUserProvider.requireUserId()).thenReturn(userId);
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(userId, "Teacher", null, "contact")));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));
    }

    private AppUser user(UUID id, String fullName, String avatarUrl, String contactInfo) {
        return new AppUser(id, "teacher@edua.vn", "sub-1", fullName, avatarUrl, contactInfo,
                Subject.MATH, UserStatus.ACTIVE, Instant.now(), null);
    }
}
