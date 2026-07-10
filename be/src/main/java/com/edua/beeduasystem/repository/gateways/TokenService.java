package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;

import java.util.Set;

/**
 * Phát và verify access JWT nội bộ (HS256). Implementation ở {@code infrastructure/security}.
 */
public interface TokenService {

    /** Phát access token cho user với danh sách roles. */
    String issueAccessToken(AppUser user, Set<Role> roles);

    AccessTokenClaims parse(String accessToken);
}
