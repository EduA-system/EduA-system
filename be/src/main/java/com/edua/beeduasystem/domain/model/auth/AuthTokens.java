package com.edua.beeduasystem.domain.model.auth;

/**
 * Kết quả cấp token cho một phiên: access JWT (trả body) + refresh raw (đặt HttpOnly cookie).
 * Refresh raw chỉ tồn tại tại thời điểm phát; DB chỉ lưu hash.
 */
public record AuthTokens(
        String accessToken,
        String refreshToken
) {
}
