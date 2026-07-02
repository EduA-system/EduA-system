package com.edua.beeduasystem.domain.exception;

/** Token không hợp lệ: Google id_token sai/hết hạn/sai audience, hoặc refresh token thiếu/revoked/hết hạn. → 401. */
public class InvalidTokenException extends RuntimeException {
    public InvalidTokenException(String message) {
        super(message);
    }
}
