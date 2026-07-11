package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.util.Set;
import java.util.UUID;

@Service
public class ProfileService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;

    public ProfileService(AppUserRepository userRepository,
                          UserRoleRepository userRoleRepository,
                          CurrentUserProvider currentUserProvider) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public record ProfileResult(AppUser user, Set<Role> roles) {
    }

    @Transactional
    public ProfileResult updateCurrentUserProfile(String fullName, String avatarUrl, String contactInfo) {
        UUID userId = currentUserProvider.requireUserId();
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found."));

        AppUser updated = userRepository.save(new AppUser(
                user.id(),
                user.email(),
                user.googleSub(),
                normalizePatchValue(fullName, user.fullName()),
                normalizeAvatarUrl(avatarUrl, user.avatarUrl()),
                normalizePatchValue(contactInfo, user.contactInfo()),
                user.subject(),
                user.status(),
                user.createdAt(),
                user.lastLoginAt()));
        Set<Role> roles = userRoleRepository.findRolesByUserId(userId);
        return new ProfileResult(updated, roles);
    }

    private static String normalizePatchValue(String value, String currentValue) {
        if (value == null) {
            return currentValue;
        }
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String normalizeAvatarUrl(String value, String currentValue) {
        String normalized = normalizePatchValue(value, currentValue);
        if (normalized == null) {
            return null;
        }
        if (value == null) {
            return normalized;
        }
        try {
            URI uri = URI.create(normalized);
            String scheme = uri.getScheme();
            if (("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))
                    && StringUtils.hasText(uri.getHost())) {
                return normalized;
            }
        } catch (IllegalArgumentException ignored) {
        }
        throw new IllegalArgumentException("URL ảnh đại diện phải là URL http hoặc https hợp lệ.");
    }
}
