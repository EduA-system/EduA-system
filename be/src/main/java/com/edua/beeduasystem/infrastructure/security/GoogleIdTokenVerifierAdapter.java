package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.GoogleIdentity;
import com.edua.beeduasystem.repository.gateways.GoogleIdentityVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collections;

/**
 * Verify Google {@code id_token} do FE gửi (Google Identity Services).
 * Kiểm tra chữ ký (Google JWKS), issuer, expiry và audience = client_id của app.
 */
@Component
public class GoogleIdTokenVerifierAdapter implements GoogleIdentityVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleIdTokenVerifierAdapter(@Value("${app.auth.google.client-id:}") String clientId) {
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                .setAudience(StringUtils.hasText(clientId) ? Collections.singletonList(clientId) : Collections.emptyList())
                .build();
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new InvalidTokenException("Missing Google id_token.");
        }
        final GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (Exception ex) {
            throw new InvalidTokenException("Cannot verify Google id_token: " + ex.getMessage());
        }
        if (token == null) {
            throw new InvalidTokenException("Invalid Google id_token (signature/issuer/audience/expiry).");
        }
        GoogleIdToken.Payload payload = token.getPayload();
        Boolean emailVerified = payload.getEmailVerified();
        return new GoogleIdentity(
                payload.getSubject(),
                payload.getEmail(),
                (String) payload.get("name"),
                Boolean.TRUE.equals(emailVerified));
    }
}
