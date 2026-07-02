package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.auth.GoogleIdentity;

/**
 * Verify Google {@code id_token} (chữ ký JWKS + iss + aud + exp).
 * Implementation ở {@code infrastructure/security}.
 */
public interface GoogleIdentityVerifier {

    /**
     * @throws com.edua.beeduasystem.domain.exception.InvalidTokenException nếu token sai/hết hạn/sai audience.
     */
    GoogleIdentity verify(String idToken);
}
