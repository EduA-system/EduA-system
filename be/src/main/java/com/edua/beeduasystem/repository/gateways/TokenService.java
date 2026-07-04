package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;

/**
 * Phát và verify access JWT nội bộ (HS256). Implementation ở {@code infrastructure/security}.
 */
public interface TokenService {

    /** Phát access token cho user (TTL cấu hình, mặc định 60′). */
    String issueAccessToken(AppUser user);

    /**
     * Verify chữ ký + exp và rút claims.
     * @throws com.edua.beeduasystem.domain.exception.InvalidTokenException nếu sai/hết hạn.
     */
    AccessTokenClaims parse(String accessToken);
}
