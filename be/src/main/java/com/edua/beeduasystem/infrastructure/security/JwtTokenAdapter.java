package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.repository.gateways.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Phát/verify access JWT nội bộ (HS256) bằng jjwt.
 * Claims: sub = userId, email, role, subject; TTL cấu hình (mặc định 60′ — SEC-03).
 */
@Component
public class JwtTokenAdapter implements TokenService {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenAdapter.class);

    private final SecretKey key;
    private final Duration accessTtl;

    public JwtTokenAdapter(
            @Value("${app.auth.jwt.secret:}") String secret,
            @Value("${app.auth.jwt.access-ttl:PT60M}") Duration accessTtl) {
        this.accessTtl = accessTtl;
        if (StringUtils.hasText(secret) && secret.getBytes(StandardCharsets.UTF_8).length >= 32) {
            this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        } else {
            // Dev fallback: chưa cấu hình APP_AUTH_JWT_SECRET (hoặc < 32 bytes). Sinh key tạm —
            // token KHÔNG sống qua restart. Bắt buộc set secret ở prod.
            log.warn("app.auth.jwt.secret chưa được cấu hình hợp lệ (>=32 bytes). Dùng key HS256 tạm cho dev.");
            this.key = Jwts.SIG.HS256.key().build();
        }
    }

    @Override
    public String issueAccessToken(AppUser user) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("role", user.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtl)))
                .signWith(key);
        if (user.subject() != null) {
            builder.claim("subject", user.subject().name());
        }
        return builder.compact();
    }

    @Override
    public AccessTokenClaims parse(String accessToken) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(accessToken).getPayload();
            String subjectClaim = c.get("subject", String.class);
            return new AccessTokenClaims(
                    UUID.fromString(c.getSubject()),
                    c.get("email", String.class),
                    Role.valueOf(c.get("role", String.class)),
                    subjectClaim != null ? Subject.valueOf(subjectClaim) : null);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidTokenException("Invalid or expired access token.");
        }
    }
}
