package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.EmailNotAllowedException;
import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.AuthTokens;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;

@Service
public class AuthService {

    private final GoogleIdentityVerifier googleVerifier;
    private final TokenService tokenService;
    private final AppUserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ActivityLogService activityLogService;
    private final Duration refreshTtl;

    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(GoogleIdentityVerifier googleVerifier,
                       TokenService tokenService,
                       AppUserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       UserRoleRepository userRoleRepository,
                       CurrentUserProvider currentUserProvider,
                       ActivityLogService activityLogService,
                       @Value("${app.auth.jwt.refresh-ttl:PT24H}") Duration refreshTtl) {
        this.googleVerifier = googleVerifier;
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
        this.refreshTtl = refreshTtl;
    }

    public record LoginResult(AppUser user, Set<Role> roles, AuthTokens tokens) {
    }

    public record RefreshResult(AppUser user, Set<Role> roles, AuthTokens tokens) {
    }

    public record CurrentUserInfo(AppUser user, Set<Role> roles) {
    }

    @Transactional
    public LoginResult loginWithGoogle(String idToken) {
        GoogleIdentity identity = googleVerifier.verify(idToken);
        if (!identity.emailVerified()) {
            throw new InvalidTokenException("Google account email is not verified.");
        }
        String email = identity.email() == null ? null : identity.email().trim().toLowerCase();
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EmailNotAllowedException("Email chưa được cấp quyền truy cập hệ thống."));
        if (user.status() == UserStatus.DISABLED) {
            throw new EmailNotAllowedException("Tài khoản đã bị khóa.");
        }

        Instant now = Instant.now();
        String googleSub = user.googleSub() != null
                ? user.googleSub()
                : AppUserFieldValidator.normalizeGoogleSubject(identity.subject());
        String fullName = StringUtils.hasText(user.fullName())
                ? user.fullName()
                : AppUserFieldValidator.normalizeOptionalFullName(identity.fullName());
        AppUser activated = new AppUser(
                user.id(),
                user.email(),
                googleSub,
                fullName,
                user.avatarUrl(),
                user.contactInfo(),
                user.bio(),
                user.phoneNumber(),
                user.subject(),
                UserStatus.ACTIVE,
                user.createdAt(),
                now);
        AppUser saved = userRepository.save(activated);

        Set<Role> roles = userRoleRepository.findRolesByUserId(saved.id());
        AuthTokens tokens = issueTokens(saved, roles, now);
        activityLogService.record(saved.id(), roleNameOf(roles), ActivityLogCategory.AUTH, ActivityLogAction.LOGIN,
                "APP_USER", saved.id(), null);
        return new LoginResult(saved, roles, tokens);
    }

    @Transactional
    public RefreshResult refresh(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            throw new InvalidTokenException("Missing refresh token.");
        }
        String hash = sha256Hex(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new InvalidTokenException("Refresh token not found."));

        Instant now = Instant.now();
        if (stored.revoked()) {
            refreshTokenRepository.revokeAllByUserId(stored.userId());
            throw new InvalidTokenException("Refresh token reuse detected.");
        }
        if (!stored.isUsable(now)) {
            throw new InvalidTokenException("Refresh token expired.");
        }

        refreshTokenRepository.revoke(stored.id());

        AppUser user = userRepository.findById(stored.userId())
                .orElseThrow(() -> new InvalidTokenException("User not found."));
        if (user.status() == UserStatus.DISABLED) {
            throw new EmailNotAllowedException("Tài khoản đã bị khóa.");
        }
        Set<Role> roles = userRoleRepository.findRolesByUserId(user.id());
        return new RefreshResult(user, roles, issueTokens(user, roles, now));
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (!StringUtils.hasText(rawRefreshToken)) {
            return;
        }
        refreshTokenRepository.findByTokenHash(sha256Hex(rawRefreshToken))
                .ifPresent(rt -> {
                    refreshTokenRepository.revoke(rt.id());
                    activityLogService.record(rt.userId(), null, ActivityLogCategory.AUTH, ActivityLogAction.LOGOUT,
                            "APP_USER", rt.userId(), null);
                });
    }

    @Transactional(readOnly = true)
    public CurrentUserInfo currentUser() {
        UUID userId = currentUserProvider.requireUserId();
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found."));
        Set<Role> roles = userRoleRepository.findRolesByUserId(userId);
        return new CurrentUserInfo(user, roles);
    }

    private AuthTokens issueTokens(AppUser user, Set<Role> roles, Instant now) {
        String access = tokenService.issueAccessToken(user, roles);
        String rawRefresh = randomToken();
        refreshTokenRepository.save(new RefreshToken(
                UUID.randomUUID(),
                user.id(),
                sha256Hex(rawRefresh),
                now.plus(refreshTtl),
                false,
                now));
        return new AuthTokens(access, rawRefresh);
    }

    private String randomToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String roleNameOf(Set<Role> roles) {
        return roles.stream().findFirst().map(Enum::name).orElse(null);
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
