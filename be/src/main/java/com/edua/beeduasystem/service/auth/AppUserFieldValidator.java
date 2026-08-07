package com.edua.beeduasystem.service.auth;

import org.springframework.util.StringUtils;

final class AppUserFieldValidator {

    static final int MAX_EMAIL_LENGTH = 320;
    static final int MAX_GOOGLE_SUB_LENGTH = 255;
    static final int MAX_FULL_NAME_LENGTH = 255;
    static final int MAX_AVATAR_URL_LENGTH = 1024;
    static final int MAX_CONTACT_INFO_LENGTH = 500;
    static final int MAX_BIO_LENGTH = 1000;
    static final int MAX_PHONE_NUMBER_LENGTH = 30;

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
