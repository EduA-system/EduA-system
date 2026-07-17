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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private GoogleIdentityVerifier verifier;
    private TokenService tokenService;
    private AppUserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private UserRoleRepository userRoleRepository;
    private AuthService authService;

    @BeforeEach
    void setup() {
        verifier = mock(GoogleIdentityVerifier.class);
        tokenService = mock(TokenService.class);
        userRepository = mock(AppUserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        authService = new AuthService(verifier, tokenService, userRepository, refreshTokenRepository,
                userRoleRepository, new CurrentUserProvider(), Duration.ofHours(24));
    }

    private AppUser invitedUser(String email) {
        return new AppUser(UUID.randomUUID(), email, null, null,
                null, null, null, UserStatus.INVITED, Instant.now(), null);
    }

    @Test
    void loginWithGoogle_allowlisted_activatesAndIssuesTokens() {
        String email = "admin@fpt.edu.vn";
        when(verifier.verify("idtok")).thenReturn(new GoogleIdentity("sub-9", email, "Admin", true));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(invitedUser(email)));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRoleRepository.findRolesByUserId(any())).thenReturn(Set.of(Role.ADMINISTRATOR));
        when(tokenService.issueAccessToken(any(), any())).thenReturn("access-jwt");

        AuthService.LoginResult result = authService.loginWithGoogle("idtok");

        assertThat(result.tokens().accessToken()).isEqualTo("access-jwt");
        assertThat(result.tokens().refreshToken()).isNotBlank();
        assertThat(result.roles()).contains(Role.ADMINISTRATOR);

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        org.mockito.Mockito.verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(UserStatus.ACTIVE);
        assertThat(saved.getValue().googleSub()).isEqualTo("sub-9");
    }

    @Test
    void loginWithGoogle_notAllowlisted_forbidden() {
        when(verifier.verify("idtok")).thenReturn(new GoogleIdentity("sub-x", "stranger@gmail.com", "X", true));
        when(userRepository.findByEmail("stranger@gmail.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.loginWithGoogle("idtok"))
                .isInstanceOf(EmailNotAllowedException.class);
    }

    @Test
    void loginWithGoogle_unverifiedEmail_rejectsLogin() {
        when(verifier.verify("idtok")).thenReturn(new GoogleIdentity("sub-x", "teacher@fpt.edu.vn", "Teacher", false));

        assertThatThrownBy(() -> authService.loginWithGoogle("idtok"))
                .isInstanceOf(InvalidTokenException.class);

        verifyNoInteractions(userRepository, tokenService, refreshTokenRepository);
    }

    @Test
    void loginWithGoogle_disabledUser_rejectsLogin() {
        String email = "disabled@fpt.edu.vn";
        AppUser disabledUser = new AppUser(UUID.randomUUID(), email, "sub-1", "Disabled User",
                null, null, null, UserStatus.DISABLED, Instant.now(), null);
        when(verifier.verify("idtok")).thenReturn(new GoogleIdentity("sub-1", email, "Disabled User", true));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(disabledUser));

        assertThatThrownBy(() -> authService.loginWithGoogle("idtok"))
                .isInstanceOf(EmailNotAllowedException.class);

        verifyNoInteractions(tokenService, refreshTokenRepository);
    }

    @Test
    void refresh_returnsUserAndRolesWithNewTokens() {
        UUID userId = UUID.randomUUID();
        AppUser user = new AppUser(userId, "teacher@fpt.edu.vn", "sub-1", "Teacher",
                null, null, null, UserStatus.ACTIVE, Instant.now(), Instant.now());
        RefreshToken refreshToken = new RefreshToken(UUID.randomUUID(), userId, "hash",
                Instant.now().plus(Duration.ofHours(1)), false, Instant.now());
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(refreshToken));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRoleRepository.findRolesByUserId(userId)).thenReturn(Set.of(Role.TEACHER));
        when(tokenService.issueAccessToken(user, Set.of(Role.TEACHER))).thenReturn("new-access-jwt");

        AuthService.RefreshResult result = authService.refresh("refresh-token");

        assertThat(result.user()).isEqualTo(user);
        assertThat(result.roles()).containsExactly(Role.TEACHER);
        assertThat(result.tokens().accessToken()).isEqualTo("new-access-jwt");
        verify(refreshTokenRepository).revoke(refreshToken.id());
    }

    @Test
    void refresh_missingToken_rejectsRequest() {
        assertThatThrownBy(() -> authService.refresh("  "))
                .isInstanceOf(InvalidTokenException.class);

        verifyNoInteractions(refreshTokenRepository);
    }

    @Test
    void refresh_revokedToken_revokesAllUserTokens() {
        UUID userId = UUID.randomUUID();
        RefreshToken revokedToken = new RefreshToken(UUID.randomUUID(), userId, "hash",
                Instant.now().plus(Duration.ofHours(1)), true, Instant.now());
        when(refreshTokenRepository.findByTokenHash(any())).thenReturn(Optional.of(revokedToken));

        assertThatThrownBy(() -> authService.refresh("reused-token"))
                .isInstanceOf(InvalidTokenException.class);

        verify(refreshTokenRepository).revokeAllByUserId(userId);
    }

    @Test
    void logout_blankToken_doesNotRevokeAnything() {
        authService.logout(" ");

        verifyNoInteractions(refreshTokenRepository);
    }
}
