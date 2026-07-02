package com.edua.beeduasystem.domain.exception;

/** Email đã verify nhưng chưa được cấp quyền (không có trong allowlist) hoặc tài khoản bị DISABLED. → 403. */
public class EmailNotAllowedException extends RuntimeException {
    public EmailNotAllowedException(String message) {
        super(message);
    }
}
