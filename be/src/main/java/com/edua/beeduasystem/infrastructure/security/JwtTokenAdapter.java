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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Issues and verifies internal HS256 access JWTs.
 * Claims: sub = userId, email, roles (comma-separated), role (primary), subject.
 */
@Component
public class JwtTokenAdapter implements TokenService {

    private final SecretKey key;
    private final Duration accessTtl;

    public JwtTokenAdapter(
            @Value("${app.auth.jwt.secret:}") String secret,
            @Value("${app.auth.jwt.access-ttl:PT60M}") Duration accessTtl) {
        this.accessTtl = accessTtl;
        if (!StringUtils.hasText(secret) || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("app.auth.jwt.secret must be configured with at least 32 UTF-8 bytes.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public String issueAccessToken(AppUser user, Set<Role> roles) {
        Instant now = Instant.now();
        String rolesStr = Role.orderedByPriority(roles).stream().map(Role::name).collect(Collectors.joining(","));
        String primaryRole = Role.primaryOf(roles).name();

        var builder = Jwts.builder()
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("roles", rolesStr)
                .claim("role", primaryRole)
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
            String rolesStr = c.get("roles", String.class);
            Set<Role> roles;
            if (StringUtils.hasText(rolesStr)) {
                roles = Arrays.stream(rolesStr.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(Role::valueOf)
                        .collect(Collectors.toSet());
            } else {
                roles = Set.of(Role.valueOf(c.get("role", String.class)));
            }
            String subjectClaim = c.get("subject", String.class);
            return new AccessTokenClaims(
                    UUID.fromString(c.getSubject()),
                    c.get("email", String.class),
                    roles,
                    subjectClaim != null ? Subject.valueOf(subjectClaim) : null);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidTokenException("Invalid or expired access token.");
        }
    }
}
