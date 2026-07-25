package com.edua.beeduasystem.domain.exception;

/**
 * Xung dot khi them hoc sinh vao lop (UC-36): da enrolled, email thuoc role khac, tai khoan
 * DISABLED, hoac lop da du si so toi da. → 409.
 */
public class ClassEnrollmentConflictException extends RuntimeException {

    private final String reason;

    public ClassEnrollmentConflictException(String reason, String message) {
        super(message);
        this.reason = reason;
    }

    /** Ma ly do may doc duoc (ALREADY_ENROLLED, ROLE_CONFLICT, ACCOUNT_DISABLED, CLASS_FULL) — dung cho import summary. */
    public String reason() {
        return reason;
    }
}
