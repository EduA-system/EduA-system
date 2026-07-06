package com.edua.beeduasystem.domain.exception;

/** Đã xác thực nhưng không đủ quyền thao tác trên tài nguyên (owner-only BR-16, subject-match BR-21). → 403. */
public class ForbiddenOperationException extends RuntimeException {
    public ForbiddenOperationException(String message) {
        super(message);
    }
}
