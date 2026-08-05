package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
import com.edua.beeduasystem.repository.gateways.TokenService;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=${IT_FLYWAY_ENABLED:false}",
        "spring.datasource.url=${IT_DB_URL:jdbc:postgresql://localhost:${POSTGRES_PORT:9118}/${POSTGRES_DB:edua_system}}",
        "spring.datasource.username=${IT_DB_USERNAME:${POSTGRES_USER:postgres}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${POSTGRES_PASSWORD:himawari}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_activity_log_it",
        "app.auth.jwt.secret=0123456789abcdef0123456789abcdef0123456789abcdef",
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
class ActivityLogIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@activity-log-it.edua.local";

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
    void IT_AL_001_itStaffViewsActivityLogList() throws Exception {
        AppUser itStaff = user("itstaff-001@activity-log-it.edua.local", "IT Staff One", null, UserStatus.ACTIVE, Role.IT_STAFF);
        AppUser moderator = user("moderator-001@activity-log-it.edua.local", "Moderator One", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser principal = user("principal-001@activity-log-it.edua.local", "Principal One", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        UUID targetId = UUID.randomUUID();
        seedActivityLog(moderator.id(), "MODERATOR", "MODERATION", "APPROVE_LIBRARY_CONTENT",
                "LIBRARY_CONTENT", targetId, null, Instant.now().minusSeconds(30));
        seedActivityLog(principal.id(), "PRINCIPAL", "ACCOUNT", "GRANT_TEACHER",
                "APP_USER", UUID.randomUUID(), "email=teacher@edua.local", Instant.now());
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/it-staff/activity-log?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(itStaff, Role.IT_STAFF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].action", hasItem("GRANT_TEACHER")))
                .andExpect(jsonPath("$.items[*].action", hasItem("APPROVE_LIBRARY_CONTENT")))
                .andExpect(jsonPath("$.items[0].actorName").value("Principal One"))
                .andExpect(jsonPath("$.items[0].category").value("ACCOUNT"))
                .andExpect(jsonPath("$.items[0].actorRole").value("PRINCIPAL"))
                .andExpect(jsonPath("$.items[0].targetType").value("APP_USER"))
                .andExpect(jsonPath("$.items[0].metadata").value("email=teacher@edua.local"))
                .andExpect(jsonPath("$.items[1].actorName").value("Moderator One"))
                .andExpect(jsonPath("$.items[1].targetId").value(targetId.toString()))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total").value(2));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_AL_002_itStaffFiltersActivityLogByActorCategoryAndDate() throws Exception {
        AppUser itStaff = user("itstaff-002@activity-log-it.edua.local", "IT Staff Two", null, UserStatus.ACTIVE, Role.IT_STAFF);
        AppUser actor = user("actor-002@activity-log-it.edua.local", "Config Actor", null, UserStatus.ACTIVE, Role.IT_STAFF);
        AppUser otherActor = user("other-002@activity-log-it.edua.local", "Other Actor", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        Instant from = Instant.parse("2026-07-31T00:00:00Z");
        Instant inside = Instant.parse("2026-07-31T10:00:00Z");
        Instant to = Instant.parse("2026-08-01T00:00:00Z");
        seedActivityLog(actor.id(), "IT_STAFF", "CONFIG", "UPDATE_SYSTEM_PROMPT",
                "AI_SYSTEM_PROMPT", null, "key=LESSON_PLAN_GENERATION", inside);
        seedActivityLog(actor.id(), "IT_STAFF", "ACCOUNT", "GRANT_IT_STAFF",
                "APP_USER", UUID.randomUUID(), null, inside.plusSeconds(60));
        seedActivityLog(otherActor.id(), "MODERATOR", "CONFIG", "UPDATE_SYSTEM_PROMPT",
                "AI_SYSTEM_PROMPT", null, "key=SLIDE_GENERATION", inside.plusSeconds(120));
        seedActivityLog(actor.id(), "IT_STAFF", "CONFIG", "UPDATE_SYSTEM_PROMPT",
                "AI_SYSTEM_PROMPT", null, "key=OLD", from.minusSeconds(60));

        mockMvc.perform(get("/api/it-staff/activity-log")
                        .param("actorId", actor.id().toString())
                        .param("category", "CONFIG")
                        .param("from", from.toString())
                        .param("to", to.toString())
                        .param("page", "0")
                        .param("size", "20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(itStaff, Role.IT_STAFF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].metadata", hasItem("key=LESSON_PLAN_GENERATION")))
                .andExpect(jsonPath("$.items[*].metadata", not(hasItem("key=SLIDE_GENERATION"))))
                .andExpect(jsonPath("$.items[*].metadata", not(hasItem("key=OLD"))))
                .andExpect(jsonPath("$.items[*].action", not(hasItem("GRANT_IT_STAFF"))))
                .andExpect(jsonPath("$.items[0].actorId").value(actor.id().toString()))
                .andExpect(jsonPath("$.items[0].actorName").value("Config Actor"))
                .andExpect(jsonPath("$.items[0].category").value("CONFIG"))
                .andExpect(jsonPath("$.items[0].action").value("UPDATE_SYSTEM_PROMPT"))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void IT_AL_003_deniesActivityLogForGuestAndNonItStaffRoles() throws Exception {
        AppUser teacher = user("teacher-003@activity-log-it.edua.local", "Teacher Three", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser moderator = user("moderator-003@activity-log-it.edua.local", "Moderator Three", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser principal = user("principal-003@activity-log-it.edua.local", "Principal Three", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser student = user("student-003@activity-log-it.edua.local", "Student Three", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        seedActivityLog(principal.id(), "PRINCIPAL", "ACCOUNT", "GRANT_MODERATOR",
                "APP_USER", UUID.randomUUID(), null, Instant.now());
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/it-staff/activity-log"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/it-staff/activity-log")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/it-staff/activity-log")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/it-staff/activity-log")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/it-staff/activity-log")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isForbidden());

        assertThat(tableCounts()).isEqualTo(before);
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(),
                email,
                null,
                fullName,
                null,
                null,
                subject,
                status,
                Instant.now(),
                null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_activity_log_it");
        jdbc.execute("SET search_path TO edua_activity_log_it");
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

    private UUID seedActivityLog(UUID actorId, String actorRole, String category, String action,
                                 String targetType, UUID targetId, String metadata, Instant createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO activity_logs (
                    id, actor_id, actor_role, category, action, target_type, target_id, metadata, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                actorId,
                actorRole,
                category,
                action,
                targetType,
                targetId,
                metadata,
                Timestamp.from(createdAt));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_activity_log_it");
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

    private Map<String, Integer> tableCounts() {
        return Map.of(
                "app_users", count("app_users"),
                "user_roles", count("user_roles"),
                "activity_logs", count("activity_logs"));
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
