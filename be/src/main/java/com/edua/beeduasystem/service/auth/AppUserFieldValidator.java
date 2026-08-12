package com.edua.beeduasystem.service.auth;

import org.springframework.util.StringUtils;

import java.time.LocalDate;

final class AppUserFieldValidator {

    static final int MAX_EMAIL_LENGTH = 320;
    static final int MAX_GOOGLE_SUB_LENGTH = 255;
    static final int MAX_FULL_NAME_LENGTH = 255;
    static final int MAX_AVATAR_URL_LENGTH = 1024;
    static final int MAX_CONTACT_INFO_LENGTH = 500;
    static final int MAX_BIO_LENGTH = 1000;
    static final int MAX_PHONE_NUMBER_LENGTH = 30;
    static final int MIN_EDUCATOR_AGE = 21;
    static final int MAX_EDUCATOR_AGE = 60;

    private static final String VIETNAM_PHONE_PATTERN = "^0[35789][0-9]{8}$";

    private AppUserFieldValidator() {
    }

    static String normalizeEmail(String email) {
        if (!StringUtils.hasText(email)) {
            throw new IllegalArgumentException("Email is required.");
        }
        String normalized = email.trim().toLowerCase();
        requireMaxLength(normalized, MAX_EMAIL_LENGTH, "Email");
        return normalized;
    }

    static String normalizeOptionalFullName(String fullName) {
        if (fullName == null) {
            return null;
        }
        String normalized = fullName.trim();
        requireMaxLength(normalized, MAX_FULL_NAME_LENGTH, "Full name");
        return normalized;
    }

    static String normalizeOptionalDisplayName(String fullName) {
        if (fullName == null) {
            return null;
        }
        String normalized = StringUtils.hasText(fullName) ? fullName.trim() : null;
        return requireMaxLength(normalized, MAX_FULL_NAME_LENGTH, "Full name");
    }

    static String normalizeVietnamPhoneNumber(String value) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException("Vui lòng nhập số điện thoại.");
        }
        String normalized = value.trim();
        if (normalized.length() > MAX_PHONE_NUMBER_LENGTH) {
            throw new IllegalArgumentException("Số điện thoại không được vượt quá 30 ký tự.");
        }
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

    static LocalDate normalizeEducatorDateOfBirth(LocalDate value) {
        if (value == null) {
            throw new IllegalArgumentException("Vui lòng nhập ngày sinh.");
        }
        LocalDate today = LocalDate.now();
        if (value.isBefore(today.minusYears(MAX_EDUCATOR_AGE))) {
            throw new IllegalArgumentException("Tuổi giáo viên không được vượt quá 60.");
        }
        if (value.isAfter(today.minusYears(MIN_EDUCATOR_AGE))) {
            throw new IllegalArgumentException("Giáo viên phải từ 21 tuổi trở lên.");
        }
        return value;
    }

    static String normalizeGoogleSubject(String googleSubject) {
        if (googleSubject == null) {
            return null;
        }
        requireMaxLength(googleSubject, MAX_GOOGLE_SUB_LENGTH, "Google subject");
        return googleSubject;
    }

    static String requireMaxLength(String value, int maxLength, String fieldName) {
        if (value != null && value.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " must not exceed " + maxLength + " characters.");
        }
        return value;
    }
}
