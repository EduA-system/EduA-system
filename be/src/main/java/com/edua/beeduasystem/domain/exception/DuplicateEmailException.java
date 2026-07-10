package com.edua.beeduasystem.domain.exception;

/** Email đã tồn tại trong hệ thống khi cố thêm tài khoản mới. → 409. */
public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String message) {
        super(message);
    }
}
