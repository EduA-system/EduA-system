package com.edua.beeduasystem.domain.exception;

/** Loi he thong giua qua trinh ghi bulk import hoc sinh (Add Student, UC-36) → 502, rollback toan bo. */
public class BulkEnrollmentFailedException extends RuntimeException {
    public BulkEnrollmentFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}
