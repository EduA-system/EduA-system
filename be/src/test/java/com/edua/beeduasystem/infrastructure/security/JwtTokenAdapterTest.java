package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenAdapterTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"; // >=32 bytes

    private AppUser user() {
        return new AppUser(UUID.randomUUID(), "teacher@fpt.edu.vn", "sub-1", "GV A",
                null, null, Subject.CHEMISTRY, UserStatus.ACTIVE, Instant.now(), Instant.now());
    }

    @Test
    void issueThenParse_roundTrip() {
        JwtTokenAdapter adapter = new JwtTokenAdapter(SECRET, Duration.ofMinutes(60));
        AppUser user = user();
        Set<Role> roles = Set.of(Role.TEACHER);

        String token = adapter.issueAccessToken(user, roles);
        AccessTokenClaims claims = adapter.parse(token);

        assertThat(claims.userId()).isEqualTo(user.id());
        assertThat(claims.email()).isEqualTo(user.email());
        assertThat(claims.roles()).contains(Role.TEACHER);
        assertThat(claims.subject()).isEqualTo(Subject.CHEMISTRY);
    }

    @Test
    void issueThenParse_multipleRoles_usesDeterministicPrimaryRole() {
        JwtTokenAdapter adapter = new JwtTokenAdapter(SECRET, Duration.ofMinutes(60));

        String token = adapter.issueAccessToken(user(), Set.of(Role.TEACHER, Role.PRINCIPAL, Role.MODERATOR));
        AccessTokenClaims claims = adapter.parse(token);

        assertThat(claims.roles()).containsExactlyInAnyOrder(Role.TEACHER, Role.MODERATOR, Role.PRINCIPAL);
        assertThat(claims.primaryRole()).isEqualTo(Role.PRINCIPAL);
    }

    @Test
    void parse_expiredToken_throws() {
        JwtTokenAdapter adapter = new JwtTokenAdapter(SECRET, Duration.ofSeconds(-1));
        String token = adapter.issueAccessToken(user(), Set.of(Role.TEACHER));
        assertThatThrownBy(() -> adapter.parse(token)).isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void parse_wrongSignature_throws() {
        String token = new JwtTokenAdapter(SECRET, Duration.ofMinutes(60)).issueAccessToken(user(), Set.of(Role.TEACHER));
        JwtTokenAdapter other = new JwtTokenAdapter("ffffffffffffffffffffffffffffffffffffffffffffffff", Duration.ofMinutes(60));
        assertThatThrownBy(() -> other.parse(token)).isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void constructor_missingOrWeakSecret_throws() {
        assertThatThrownBy(() -> new JwtTokenAdapter("", Duration.ofMinutes(60)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.auth.jwt.secret");
        assertThatThrownBy(() -> new JwtTokenAdapter("too-short", Duration.ofMinutes(60)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 UTF-8 bytes");
    }
}
