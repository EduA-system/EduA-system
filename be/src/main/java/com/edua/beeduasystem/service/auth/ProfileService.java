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
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Service
public class ProfileService {
    private static final LocalDate MIN_DATE_OF_BIRTH = LocalDate.of(1900, 1, 1);
    private static final String VIETNAM_PHONE_PATTERN = "^0[35789][0-9]{8}$";

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
    public ProfileResult updateCurrentUserProfile(String fullName, String avatarUrl, String contactInfo,
                                                  String bio, String phoneNumber, LocalDate dateOfBirth) {
        UUID userId = currentUserProvider.requireUserId();
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("User not found."));
        Set<Role> roles = userRoleRepository.findRolesByUserId(userId);
        boolean isStudent = roles.contains(Role.STUDENT);
        LocalDate normalizedDateOfBirth = roles.contains(Role.STUDENT)
                ? user.dateOfBirth()
                : normalizeDateOfBirth(dateOfBirth);
        String normalizedPhoneNumber = isStudent
                ? user.phoneNumber()
                : normalizeVietnamPhoneNumber(phoneNumber);

        AppUser updated = userRepository.save(new AppUser(
                user.id(),
                user.email(),
                user.googleSub(),
                normalizePatchValue(fullName, user.fullName(),
                        AppUserFieldValidator.MAX_FULL_NAME_LENGTH, "Full name"),
                normalizeAvatarUrl(avatarUrl, user.avatarUrl()),
                normalizePatchValue(contactInfo, user.contactInfo(),
                        AppUserFieldValidator.MAX_CONTACT_INFO_LENGTH, "Contact info"),
                normalizePatchValue(bio, user.bio(),
                        AppUserFieldValidator.MAX_BIO_LENGTH, "Bio"),
                normalizedPhoneNumber,
                user.subject(),
                user.status(),
                user.createdAt(),
                user.lastLoginAt(),
                normalizedDateOfBirth));
        return new ProfileResult(updated, roles);
    }

    private static LocalDate normalizeDateOfBirth(LocalDate value) {
        if (value == null) {
            throw new IllegalArgumentException("Vui lòng nhập ngày sinh.");
        }
        if (value.isBefore(MIN_DATE_OF_BIRTH)) {
            throw new IllegalArgumentException("Ngày sinh không được trước 01/01/1900.");
        }
        if (value.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("Ngày sinh không được ở tương lai.");
        }
        return value;
    }

    private static String normalizeVietnamPhoneNumber(String value) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Vui lòng nhập số điện thoại.");
        }
        String normalized = value.trim();
        if (!normalized.matches("[0-9]+")) {
            throw new IllegalArgumentException("Số điện thoại chỉ được chứa chữ số.");
        }
        if (normalized.length() != 10) {
            throw new IllegalArgumentException("Số điện thoại phải gồm đúng 10 chữ số.");
        }
        if (!normalized.matches(VIETNAM_PHONE_PATTERN)) {
            throw new IllegalArgumentException("Số điện thoại phải bắt đầu bằng 03, 05, 07, 08 hoặc 09.");
        }
        return normalized;
    }

    private static String normalizePatchValue(String value, String currentValue, int maxLength, String fieldName) {
        if (value == null) {
            return currentValue;
        }
        String normalized = StringUtils.hasText(value) ? value.trim() : null;
        return AppUserFieldValidator.requireMaxLength(normalized, maxLength, fieldName);
    }

    private static String normalizeAvatarUrl(String value, String currentValue) {
        String normalized = normalizePatchValue(value, currentValue,
                AppUserFieldValidator.MAX_AVATAR_URL_LENGTH, "Avatar URL");
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
