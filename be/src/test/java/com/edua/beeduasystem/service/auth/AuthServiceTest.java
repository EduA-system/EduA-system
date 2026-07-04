package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.EmailNotAllowedException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.GoogleIdentity;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.gateways.GoogleIdentityVerifier;
import com.edua.beeduasystem.repository.gateways.TokenService;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private GoogleIdentityVerifier verifier;
    private TokenService tokenService;
    private AppUserRepository userRepository;
    private RefreshTokenRepository refreshTokenRepository;
    private AuthService authService;

    @BeforeEach
    void setup() {
        verifier = mock(GoogleIdentityVerifier.class);
        tokenService = mock(TokenService.class);
        userRepository = mock(AppUserRepository.class);
        refreshTokenRepository = mock(RefreshTokenRepository.class);
        authService = new AuthService(verifier, tokenService, userRepository, refreshTokenRepository,
                new CurrentUserProvider(), Duration.ofHours(24));
    }

    private AppUser invitedUser(String email) {
        return new AppUser(UUID.randomUUID(), email, null, null,
                Role.ADMINISTRATOR, null, UserStatus.INVITED, Instant.now(), null);
    }

    @Test
    void loginWithGoogle_allowlisted_activatesAndIssuesTokens() {
        String email = "admin@fpt.edu.vn";
        when(verifier.verify("idtok")).thenReturn(new GoogleIdentity("sub-9", email, "Admin", true));
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(invitedUser(email)));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(tokenService.issueAccessToken(any())).thenReturn("access-jwt");

        AuthService.LoginResult result = authService.loginWithGoogle("idtok");

        assertThat(result.tokens().accessToken()).isEqualTo("access-jwt");
        assertThat(result.tokens().refreshToken()).isNotBlank();

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
}
