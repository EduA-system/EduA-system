package com.edua.beeduasystem.domain.exception;

/**
 * Xung dot khi them hoc sinh vao lop (UC-36): da enrolled, email thuoc role khac, tai khoan
 * DISABLED, hoac lop da du si so toi da. → 409.
 */
public class ClassEnrollmentConflictException extends RuntimeException {

    private final String reason;
    private final Object details;

    public ClassEnrollmentConflictException(String reason, String message) {
        this(reason, message, null);
    }

    /** {@code details} kèm thông tin tài khoản cũ (ví dụ PROFILE_MISMATCH) để FE hỏi xác nhận gán lại. */
    public ClassEnrollmentConflictException(String reason, String message, Object details) {
        super(message);
        this.reason = reason;
        this.details = details;
    }

    /** Ma ly do may doc duoc (ALREADY_ENROLLED, ROLE_CONFLICT, ACCOUNT_DISABLED, CLASS_FULL) — dung cho import summary. */
    public String reason() {
        return reason;
    }

    /** Dữ liệu bổ sung đi kèm (thông tin tài khoản cũ khi PROFILE_MISMATCH) — có thể null. */
    public Object details() {
        return details;
    }
}
