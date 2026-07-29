package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.EmailNotAllowedException;
import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.GoogleIdentity;
import com.edua.beeduasystem.domain.model.auth.RefreshToken;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.gateways.GoogleIdentityVerifier;
import com.edua.beeduasystem.repository.gateways.TokenService;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.RefreshTokenRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AuthServiceWorkbookTest {

    private GoogleIdentityVerifier verifier;
    private TokenService tokenService;
    private AppUserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private UserRoleRepository userRoleRepository;
    private ActivityLogService activityLogService;
    private AuthService service;

    @BeforeEach
    void setUp() {
        verifier = mock(GoogleIdentityVerifier.class);
        tokenService = mock(TokenService.class);
        userRepository = mock(AppUserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        activityLogService = mock(ActivityLogService.class);
        service = new AuthService(verifier, tokenService, userRepository, refreshTokenRepository,
                userRoleRepository, new CurrentUserProvider(), activityLogService, Duration.ofHours(24));
    }

    @Test
    void utcLog02_activeUserKeepsExistingGoogleSubjectAndUsesGoogleNameWhenNameBlank() {
        UUID userId = UUID.randomUUID();
        AppUser user = user(userId, "teacher@edua.vn", "old-google-sub", " ", UserStatus.ACTIVE);
        when(verifier.verify("valid-google-id-token"))
                .thenReturn(new GoogleIdentity("new-google-sub", "teacher@edua.vn", "Google Teacher", true));
        when(userRepository.findByEmail("teacher@edua.vn")).thenReturn(Optional.of(user));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));
        when(tokenService.issueAccessToken(any(), any())).thenReturn("access-token");

        AuthService.LoginResult result = service.loginWithGoogle("valid-google-id-token");

        assertThat(result.user().status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(result.user().googleSub()).isEqualTo("old-google-sub");
        assertThat(result.user().fullName()).isEqualTo("Google Teacher");
        assertThat(result.roles()).containsExactly(Role.TEACHER);
        assertThat(result.tokens().accessToken()).isEqualTo("access-token");
    }

    @Test
    void utcLog03_normalizesGoogleEmailBeforeAllowlistLookup() {
        UUID userId = UUID.randomUUID();
        when(verifier.verify("valid-google-id-token"))
                .thenReturn(new GoogleIdentity("sub-1", "  Teacher@EduA.VN  ", "Teacher", true));
        when(userRepository.findByEmail("teacher@edua.vn"))
                .thenReturn(Optional.of(user(userId, "teacher@edua.vn", null, "Teacher", UserStatus.ACTIVE)));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));
        when(tokenService.issueAccessToken(any(), any())).thenReturn("access-token");

        service.loginWithGoogle("valid-google-id-token");

        verify(userRepository).findByEmail("teacher@edua.vn");
    }

    @Test
    void utcLog04_invalidGoogleTokenPropagatesInvalidTokenException() {
        when(verifier.verify("bad-token")).thenThrow(new InvalidTokenException("Invalid Google ID token."));

        assertThatThrownBy(() -> service.loginWithGoogle("bad-token"))
                .isInstanceOf(InvalidTokenException.class);

        verifyNoInteractions(userRepository, tokenService, refreshTokenRepository, userRoleRepository);
    }

    @Test
    void utcLog08_blankGoogleTokenIsRejectedByVerifier() {
        when(verifier.verify("   ")).thenThrow(new InvalidTokenException("Invalid Google ID token."));

        assertThatThrownBy(() -> service.loginWithGoogle("   "))
                .isInstanceOf(InvalidTokenException.class);

        verifyNoInteractions(userRepository, tokenService, refreshTokenRepository, userRoleRepository);
    }


    @Test
    void utcLog09_googleSubjectAt255CharactersIsAccepted() {
        UUID userId = UUID.randomUUID();
        String googleSubject = "s".repeat(255);
        AppUser user = user(userId, "teacher@edua.vn", null, "Teacher", UserStatus.ACTIVE);
        stubSuccessfulGoogleLogin(user, new GoogleIdentity(
                googleSubject, "teacher@edua.vn", "Google Teacher", true));

        AuthService.LoginResult result = service.loginWithGoogle("valid-google-id-token");

        assertThat(result.user().googleSub()).isEqualTo(googleSubject);
        assertThat(result.user().googleSub()).hasSize(255);
    }

    @Test
    void utcLog10_googleSubjectOver255CharactersIsRejected() {
        UUID userId = UUID.randomUUID();
        AppUser user = user(userId, "teacher@edua.vn", null, "Teacher", UserStatus.ACTIVE);
        when(verifier.verify("valid-google-id-token")).thenReturn(new GoogleIdentity(
                "s".repeat(256), "teacher@edua.vn", "Google Teacher", true));
        when(userRepository.findByEmail("teacher@edua.vn")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.loginWithGoogle("valid-google-id-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Google subject must not exceed 255 characters.");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(tokenService, refreshTokenRepository, userRoleRepository);
    }

    @Test
    void utcLog11_googleFullNameAt255CharactersIsAccepted() {
        UUID userId = UUID.randomUUID();
        String fullName = "n".repeat(255);
        AppUser user = user(userId, "teacher@edua.vn", "existing-subject", " ", UserStatus.ACTIVE);
        stubSuccessfulGoogleLogin(user, new GoogleIdentity(
                "new-subject", "teacher@edua.vn", fullName, true));

        AuthService.LoginResult result = service.loginWithGoogle("valid-google-id-token");

        assertThat(result.user().fullName()).isEqualTo(fullName);
        assertThat(result.user().fullName()).hasSize(255);
    }

    @Test
    void utcLog12_googleFullNameOver255CharactersIsRejected() {
        UUID userId = UUID.randomUUID();
        AppUser user = user(userId, "teacher@edua.vn", "existing-subject", " ", UserStatus.ACTIVE);
        when(verifier.verify("valid-google-id-token")).thenReturn(new GoogleIdentity(
                "new-subject", "teacher@edua.vn", "n".repeat(256), true));
        when(userRepository.findByEmail("teacher@edua.vn")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.loginWithGoogle("valid-google-id-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Full name must not exceed 255 characters.");

        verify(userRepository, never()).save(any());
        verifyNoInteractions(tokenService, refreshTokenRepository, userRoleRepository);
    }

    @Test
    void utcRef03_tokenHashNotFoundRejectsRequest() {
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("refresh-token"))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("not found");

        verify(refreshTokenRepository, never()).revoke(any());
    }

    @Test
    void utcRef05_expiredTokenRejectsRequestWithoutIssuingTokens() {
        UUID userId = UUID.randomUUID();
        RefreshToken expired = new RefreshToken(UUID.randomUUID(), userId, "hash",
                Instant.now().minus(Duration.ofMinutes(1)), false, Instant.now());
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.refresh("refresh-token"))

                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("expired");

        verify(refreshTokenRepository, never()).revoke(expired.id());
        verifyNoInteractions(userRepository, tokenService, userRoleRepository);
    }

    @Test
    void utcRef06_missingAssociatedUserRejectsAfterRevokingOldToken() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = usableToken(userId);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.refresh("refresh-token"))
                .isInstanceOf(InvalidTokenException.class)
                .hasMessageContaining("User not found");

        verify(refreshTokenRepository).revoke(token.id());
    }

    @Test
    void utcRef07_disabledAssociatedUserRejectsAfterRevokingOldToken() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = usableToken(userId);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(userId, "disabled@edua.vn", "sub-1", "Disabled", UserStatus.DISABLED)));

        assertThatThrownBy(() -> service.refresh("refresh-token"))
                .isInstanceOf(EmailNotAllowedException.class);

        verify(refreshTokenRepository).revoke(token.id());
        verifyNoInteractions(tokenService, userRoleRepository);
    }

    @Test
    void refresh_savesNewRefreshTokenWhenSuccessful() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = usableToken(userId);
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepository.findById(userId))
                .thenReturn(Optional.of(user(userId, "teacher@edua.vn", "sub-1", "Teacher", UserStatus.ACTIVE)));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));
        when(tokenService.issueAccessToken(any(), any())).thenReturn("new-access-token");

        AuthService.RefreshResult result = service.refresh("refresh-token");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(saved.capture());
        assertThat(result.tokens().accessToken()).isEqualTo("new-access-token");
        assertThat(result.tokens().refreshToken()).isNotBlank();
        assertThat(saved.getValue().userId()).isEqualTo(userId);
        assertThat(saved.getValue().revoked()).isFalse();
    }

    private RefreshToken usableToken(UUID userId) {
        return new RefreshToken(UUID.randomUUID(), userId, "hash",
                Instant.now().plus(Duration.ofHours(1)), false, Instant.now());
    }

    private void stubSuccessfulGoogleLogin(AppUser user, GoogleIdentity identity) {
        when(verifier.verify("valid-google-id-token")).thenReturn(identity);
        when(userRepository.findByEmail(user.email())).thenReturn(Optional.of(user));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRoleRepository.findRolesByUserId(user.id())).thenReturn(Set.of(Role.TEACHER));
        when(tokenService.issueAccessToken(any(), any())).thenReturn("access-token");
    }

    private AppUser user(UUID id, String email, String googleSub, String fullName, UserStatus status) {
        return new AppUser(id, email, googleSub, fullName,
                null, null, null, status, Instant.now(), null);
    }
}
