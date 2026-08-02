package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.GoogleIdentity;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
import com.edua.beeduasystem.repository.gateways.GoogleIdentityVerifier;
import com.edua.beeduasystem.repository.gateways.TokenService;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=${IT_FLYWAY_ENABLED:false}",
        "spring.datasource.url=${IT_DB_URL:${DB_URL}}",
        "spring.datasource.username=${IT_DB_USERNAME:${DB_USERNAME}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${DB_PASSWORD}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_auth_profile_it",
        "app.auth.jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef",
        "app.auth.jwt.refresh-ttl=PT24H",
        "app.auth.cookie.secure=false",
        "app.auth.principal-seed-email=",
        "app.ai.deepseek.api-key=test-key",
        "app.ai.deepseek.base-url=https://example.invalid",
        "app.r2.endpoint=http://localhost:9000",
        "app.r2.access-key-id=test",
        "app.r2.secret-access-key=test",
        "app.r2.bucket=test",
        "app.r2.public-url=http://localhost:9000/test",
        "app.auth.rate-limit.standard-per-minute=1000"
})
@AutoConfigureMockMvc
class AuthenticationProfileIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@auth-profile-it.edua.local";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GoogleIdentityVerifier googleIdentityVerifier;

    @MockBean
    private TextbookCatalogImporter textbookCatalogImporter;

    @BeforeEach
    void resetDatabase() {
        ensureTables();
        deleteTestData();
        ensureRoles();
    }

    @AfterEach
    void cleanUpDatabase() {
        deleteTestData();
    }

    @Test
    void IT_AP_001_allowedUserLogsInWithGoogleSso() throws Exception {
        AppUser invited = user("teacher-001@auth-profile-it.edua.local", null, Subject.MATH, UserStatus.INVITED, Role.TEACHER);
        when(googleIdentityVerifier.verify("allowed-google-token"))
                .thenReturn(new GoogleIdentity("google-sub-001", "teacher-001@auth-profile-it.edua.local", "Google Teacher", true));
        int beforeRefreshTokens = count("refresh_tokens");
        int beforeLogs = countActivity("LOGIN");

        String body = mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"allowed-google-token\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Path=/api/auth")))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value(invited.id().toString()))
                .andExpect(jsonPath("$.user.email").value("teacher-001@auth-profile-it.edua.local"))
                .andExpect(jsonPath("$.user.fullName").value("Google Teacher"))
                .andExpect(jsonPath("$.user.role").value("TEACHER"))
                .andExpect(jsonPath("$.user.roles", hasItem("TEACHER")))
                .andExpect(jsonPath("$.user.subject").value("MATH"))
                .andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(body).path("accessToken").asText()).isNotBlank();
        Map<String, Object> user = requireUser(invited.id());
        assertThat(user.get("status")).isEqualTo("ACTIVE");
        assertThat(user.get("google_sub")).isEqualTo("google-sub-001");
        assertThat(user.get("full_name")).isEqualTo("Google Teacher");
        assertThat(user.get("last_login_at")).isNotNull();
        assertThat(count("refresh_tokens")).isEqualTo(beforeRefreshTokens + 1);
        assertThat(countActivity("LOGIN")).isEqualTo(beforeLogs + 1);
        assertActivity("LOGIN", invited.id());
    }

    @Test
    void IT_AP_002_deniesGoogleLoginForNonAllowlistedOrUnverifiedEmail() throws Exception {
        when(googleIdentityVerifier.verify("unknown-google-token"))
                .thenReturn(new GoogleIdentity("google-sub-002", "unknown-002@auth-profile-it.edua.local", "Unknown User", true));
        when(googleIdentityVerifier.verify("unverified-google-token"))
                .thenReturn(new GoogleIdentity("google-sub-003", "teacher-002@auth-profile-it.edua.local", "Unverified User", false));
        user("teacher-002@auth-profile-it.edua.local", "Teacher Two", Subject.CHEMISTRY, UserStatus.INVITED, Role.TEACHER);
        int beforeUsers = count("app_users");
        int beforeRefreshTokens = count("refresh_tokens");
        int beforeLogs = count("activity_logs");

        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"unknown-google-token\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Email chưa được cấp quyền truy cập hệ thống."));
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"unverified-google-token\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(count("app_users")).isEqualTo(beforeUsers);
        assertThat(count("refresh_tokens")).isEqualTo(beforeRefreshTokens);
        assertThat(count("activity_logs")).isEqualTo(beforeLogs);
        assertThat(findUserByEmail("teacher-002@auth-profile-it.edua.local").get("status")).isEqualTo("INVITED");
    }

    @Test
    void IT_AP_003_authenticatedUserRefreshesSessionWithRotatedCookie() throws Exception {
        AppUser user = user("teacher-003@auth-profile-it.edua.local", "Teacher Three", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        when(googleIdentityVerifier.verify("refresh-login-token"))
                .thenReturn(new GoogleIdentity("google-sub-003", "teacher-003@auth-profile-it.edua.local", "Teacher Three", true));
        String firstSetCookie = mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"refresh-login-token\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String firstRefreshToken = refreshTokenFromSetCookie(firstSetCookie);
        int beforeRefreshTokens = count("refresh_tokens");

        String secondSetCookie = mockMvc.perform(post("/api/auth/refresh")
                        .header(HttpHeaders.COOKIE, "refresh_token=" + firstRefreshToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value(user.id().toString()))
                .andExpect(jsonPath("$.user.roles", hasItem("TEACHER")))
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String secondRefreshToken = refreshTokenFromSetCookie(secondSetCookie);

        assertThat(secondRefreshToken).isNotBlank().isNotEqualTo(firstRefreshToken);
        assertThat(count("refresh_tokens")).isEqualTo(beforeRefreshTokens + 1);
        assertThat(requireRefreshToken(firstRefreshToken).get("revoked")).isEqualTo(true);
        assertThat(requireRefreshToken(secondRefreshToken).get("revoked")).isEqualTo(false);

        mockMvc.perform(post("/api/auth/refresh")
                        .header(HttpHeaders.COOKIE, "refresh_token=" + firstRefreshToken))
                .andExpect(status().isUnauthorized());
        assertThat(requireRefreshToken(secondRefreshToken).get("revoked")).isEqualTo(true);
    }

    @Test
    void IT_AP_004_authenticatedUserLogsOutAndRefreshCookieIsCleared() throws Exception {
        AppUser user = user("teacher-004@auth-profile-it.edua.local", "Teacher Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        when(googleIdentityVerifier.verify("logout-login-token"))
                .thenReturn(new GoogleIdentity("google-sub-004", "teacher-004@auth-profile-it.edua.local", "Teacher Four", true));
        String setCookie = mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"idToken\":\"logout-login-token\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String refreshToken = refreshTokenFromSetCookie(setCookie);
        int beforeLogoutLogs = countActivity("LOGOUT");

        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.COOKIE, "refresh_token=" + refreshToken))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("refresh_token=;")));

        assertThat(requireRefreshToken(refreshToken).get("revoked")).isEqualTo(true);
        assertThat(countActivity("LOGOUT")).isEqualTo(beforeLogoutLogs + 1);
        assertActivity("LOGOUT", user.id());

        mockMvc.perform(post("/api/auth/refresh")
                        .header(HttpHeaders.COOKIE, "refresh_token=" + refreshToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void IT_AP_005_authenticatedUserViewsCurrentUser() throws Exception {
        AppUser moderator = user("moderator-005@auth-profile-it.edua.local", "Moderator Five", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(moderator.id().toString()))
                .andExpect(jsonPath("$.email").value("moderator-005@auth-profile-it.edua.local"))
                .andExpect(jsonPath("$.fullName").value("Moderator Five"))
                .andExpect(jsonPath("$.role").value("MODERATOR"))
                .andExpect(jsonPath("$.roles", hasItem("MODERATOR")))
                .andExpect(jsonPath("$.subject").value("CHEMISTRY"));

        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void IT_AP_006_authenticatedUserUpdatesProfile() throws Exception {
        AppUser teacher = user("teacher-006@auth-profile-it.edua.local", "Original Name", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);

        mockMvc.perform(patch("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "  Updated Teacher  ",
                                  "avatarUrl": "https://cdn.example.test/avatar.png",
                                  "contactInfo": "  0909000006  "
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(teacher.id().toString()))
                .andExpect(jsonPath("$.fullName").value("Updated Teacher"))
                .andExpect(jsonPath("$.avatarUrl").value("https://cdn.example.test/avatar.png"))
                .andExpect(jsonPath("$.contactInfo").value("0909000006"))
                .andExpect(jsonPath("$.roles", hasItem("TEACHER")))
                .andExpect(jsonPath("$.subject").value("PHYSICS"));

        Map<String, Object> updated = requireUser(teacher.id());
        assertThat(updated.get("full_name")).isEqualTo("Updated Teacher");
        assertThat(updated.get("avatar_url")).isEqualTo("https://cdn.example.test/avatar.png");
        assertThat(updated.get("contact_info")).isEqualTo("0909000006");
        assertThat(updated.get("email")).isEqualTo("teacher-006@auth-profile-it.edua.local");
        assertThat(updated.get("subject")).isEqualTo("PHYSICS");

        mockMvc.perform(patch("/api/users/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatarUrl\":\"not-a-url\"}"))
                .andExpect(status().isBadRequest());
        assertThat(requireUser(teacher.id()).get("avatar_url")).isEqualTo("https://cdn.example.test/avatar.png");

        mockMvc.perform(patch("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Guest Update\"}"))
                .andExpect(status().isUnauthorized());
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(), email, null, fullName, null, null, subject, status, Instant.now(), null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_auth_profile_it");
        jdbc.execute("SET search_path TO edua_auth_profile_it");
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS app_users (
                    id UUID PRIMARY KEY,
                    email VARCHAR(320) NOT NULL UNIQUE,
                    google_sub VARCHAR(255) UNIQUE,
                    full_name VARCHAR(255),
                    avatar_url VARCHAR(1000),
                    contact_info VARCHAR(1000),
                    subject VARCHAR(20),
                    status VARCHAR(20) NOT NULL DEFAULT 'INVITED',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    last_login_at TIMESTAMPTZ
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS roles (
                    id UUID PRIMARY KEY,
                    name VARCHAR(20) NOT NULL UNIQUE
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS user_roles (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES app_users (id),
                    role_id UUID NOT NULL REFERENCES roles (id),
                    granted_by UUID REFERENCES app_users (id),
                    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    UNIQUE (user_id, role_id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id UUID PRIMARY KEY,
                    user_id UUID NOT NULL REFERENCES app_users (id),
                    token_hash VARCHAR(64) NOT NULL UNIQUE,
                    expires_at TIMESTAMPTZ NOT NULL,
                    revoked BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id UUID PRIMARY KEY,
                    actor_id UUID NOT NULL,
                    actor_role VARCHAR(20),
                    category VARCHAR(20) NOT NULL,
                    action VARCHAR(40) NOT NULL,
                    target_type VARCHAR(40),
                    target_id UUID,
                    metadata VARCHAR(1000),
                    created_at TIMESTAMPTZ NOT NULL
                )
                """);
    }

    private void ensureRoles() {
        jdbc.update("""
                INSERT INTO roles (id, name) VALUES
                    ('a0000000-0000-0000-0000-000000000001', 'TEACHER'),
                    ('a0000000-0000-0000-0000-000000000002', 'MODERATOR'),
                    ('a0000000-0000-0000-0000-000000000003', 'PRINCIPAL'),
                    ('a0000000-0000-0000-0000-000000000004', 'IT_STAFF'),
                    ('a0000000-0000-0000-0000-000000000005', 'STUDENT')
                ON CONFLICT (name) DO NOTHING
                """);
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_auth_profile_it");
        jdbc.update("DELETE FROM activity_logs");
        jdbc.update("""
                DELETE FROM refresh_tokens
                WHERE user_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                """, TEST_EMAIL_PATTERN);
        jdbc.update("""
                DELETE FROM user_roles
                WHERE user_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                   OR granted_by IN (SELECT id FROM app_users WHERE email LIKE ?)
                """, TEST_EMAIL_PATTERN, TEST_EMAIL_PATTERN);
        jdbc.update("DELETE FROM app_users WHERE email LIKE ?", TEST_EMAIL_PATTERN);
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private int countActivity(String action) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM activity_logs WHERE action = ?", Integer.class, action);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireUser(UUID id) {
        return jdbc.queryForMap("SELECT * FROM app_users WHERE id = ?", id);
    }

    private Map<String, Object> findUserByEmail(String email) {
        return jdbc.queryForMap("SELECT * FROM app_users WHERE email = ?", email);
    }

    private Map<String, Object> requireRefreshToken(String rawToken) {
        return jdbc.queryForMap("SELECT * FROM refresh_tokens WHERE token_hash = ?", sha256Hex(rawToken));
    }

    private void assertActivity(String action, UUID actorId) {
        Map<String, Object> log = jdbc.queryForMap(
                "SELECT * FROM activity_logs WHERE action = ? AND actor_id = ? ORDER BY created_at DESC LIMIT 1",
                action,
                actorId);
        assertThat(log.get("category")).isEqualTo("AUTH");
        assertThat(log.get("target_type")).isEqualTo("APP_USER");
        assertThat(log.get("target_id")).isEqualTo(actorId);
        assertThat(log.get("created_at")).isNotNull();
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }

    private static String refreshTokenFromSetCookie(String setCookie) {
        assertThat(setCookie).isNotBlank();
        String prefix = "refresh_token=";
        int start = setCookie.indexOf(prefix);
        assertThat(start).isGreaterThanOrEqualTo(0);
        int valueStart = start + prefix.length();
        int valueEnd = setCookie.indexOf(';', valueStart);
        return valueEnd >= 0 ? setCookie.substring(valueStart, valueEnd) : setCookie.substring(valueStart);
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
