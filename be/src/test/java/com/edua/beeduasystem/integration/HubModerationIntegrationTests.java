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
import org.springframework.http.MediaType;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=${IT_FLYWAY_ENABLED:false}",
        "spring.datasource.url=${IT_DB_URL:${DB_URL}}",
        "spring.datasource.username=${IT_DB_USERNAME:${DB_USERNAME}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${DB_PASSWORD}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_hub_moderation_it",
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
class HubModerationIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@hub-moderation-it.edua.local";

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
    void IT_HM_001_moderatorViewsSameSubjectSubmittedQueue() throws Exception {
        AppUser moderator = user("moderator-001@hub-moderation-it.edua.local", "Math Moderator", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-001@hub-moderation-it.edua.local", "Math Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        seedLibraryContent("Math Submitted Queue", teacher.id(), "LESSON_PLAN", Subject.MATH, "SUBMITTED", null);
        seedLibraryContent("Chemistry Submitted Queue", teacher.id(), "LESSON_PLAN", Subject.CHEMISTRY, "SUBMITTED", null);
        seedLibraryContent("Math Private Queue", teacher.id(), "LESSON_PLAN", Subject.MATH, "PRIVATE", null);
        seedLibraryContent("Math Approved Queue", teacher.id(), "LESSON_PLAN", Subject.MATH, "APPROVED", null);
        seedLibraryContent("Math Rejected Queue", teacher.id(), "LESSON_PLAN", Subject.MATH, "REJECTED", null);
        seedLibraryContent("Math Deleted Queue", teacher.id(), "LESSON_PLAN", Subject.MATH, "SUBMITTED", Instant.now());
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents/moderation-queue?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Math Submitted Queue")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Chemistry Submitted Queue"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Math Private Queue"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Math Approved Queue"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Math Rejected Queue"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Math Deleted Queue"))))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_HM_002_moderatorApprovesSubmittedContent() throws Exception {
        AppUser moderator = user("moderator-002@hub-moderation-it.edua.local", "Physics Moderator", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-002@hub-moderation-it.edua.local", "Physics Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Physics Submitted Approval", teacher.id(), "SLIDE_DECK", Subject.PHYSICS, "SUBMITTED", null);
        int beforeLogs = countActivity("APPROVE_LIBRARY_CONTENT");

        mockMvc.perform(post("/api/library/contents/{id}/approval", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(contentId.toString()))
                .andExpect(jsonPath("$.title").value("Physics Submitted Approval"))
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.rejectionReason").doesNotExist());

        Map<String, Object> row = requireLibraryContent(contentId);
        assertThat(row.get("status")).isEqualTo("APPROVED");
        assertThat(row.get("reviewed_by")).isEqualTo(moderator.id());
        assertThat(row.get("reviewed_at")).isNotNull();
        assertThat(row.get("rejection_reason")).isNull();
        assertThat(row.get("deleted_at")).isNull();
        assertThat(countActivity("APPROVE_LIBRARY_CONTENT")).isEqualTo(beforeLogs + 1);
        assertActivityLog("APPROVE_LIBRARY_CONTENT", moderator.id(), contentId, null);

        mockMvc.perform(get("/api/hub/contents?page=0&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Physics Submitted Approval")))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void IT_HM_003_moderatorRejectsSubmittedContentWithReason() throws Exception {
        AppUser moderator = user("moderator-003@hub-moderation-it.edua.local", "Chemistry Moderator", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-003@hub-moderation-it.edua.local", "Chemistry Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Chemistry Submitted Rejection", teacher.id(), "LESSON_PLAN", Subject.CHEMISTRY, "SUBMITTED", null);
        UUID blankReasonId = seedLibraryContent("Chemistry Blank Rejection", teacher.id(), "LESSON_PLAN", Subject.CHEMISTRY, "SUBMITTED", null);
        int beforeLogs = countActivity("REJECT_LIBRARY_CONTENT");

        mockMvc.perform(post("/api/library/contents/{id}/rejection", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"  Missing rubric detail  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(contentId.toString()))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Missing rubric detail"));

        Map<String, Object> row = requireLibraryContent(contentId);
        assertThat(row.get("status")).isEqualTo("REJECTED");
        assertThat(row.get("reviewed_by")).isEqualTo(moderator.id());
        assertThat(row.get("reviewed_at")).isNotNull();
        assertThat(row.get("rejection_reason")).isEqualTo("Missing rubric detail");
        assertThat(countActivity("REJECT_LIBRARY_CONTENT")).isEqualTo(beforeLogs + 1);
        assertActivityLog("REJECT_LIBRARY_CONTENT", moderator.id(), contentId, "Missing rubric detail");

        mockMvc.perform(post("/api/library/contents/{id}/rejection", blankReasonId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(requireLibraryContent(blankReasonId).get("status")).isEqualTo("SUBMITTED");
        assertThat(countActivity("REJECT_LIBRARY_CONTENT")).isEqualTo(beforeLogs + 1);
    }

    @Test
    void IT_HM_004_deniesUnauthorizedOrInvalidModeration() throws Exception {
        AppUser mathModerator = user("math.mod-004@hub-moderation-it.edua.local", "Math Moderator", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser chemistryModerator = user("chem.mod-004@hub-moderation-it.edua.local", "Chemistry Moderator", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-004@hub-moderation-it.edua.local", "Teacher Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser principal = user("principal-004@hub-moderation-it.edua.local", "Principal Four", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        UUID mathSubmittedId = seedLibraryContent("Math Submitted Denial", teacher.id(), "LESSON_PLAN", Subject.MATH, "SUBMITTED", null);
        UUID privateId = seedLibraryContent("Math Private Denial", teacher.id(), "LESSON_PLAN", Subject.MATH, "PRIVATE", null);
        Map<String, Object> submittedBefore = requireLibraryContent(mathSubmittedId);
        Map<String, Object> privateBefore = requireLibraryContent(privateId);
        int beforeLogs = count("activity_logs");

        mockMvc.perform(get("/api/library/contents/moderation-queue"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/library/contents/{id}/approval", mathSubmittedId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/library/contents/{id}/rejection", mathSubmittedId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Guest\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/library/contents/moderation-queue")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/library/contents/{id}/approval", mathSubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/library/contents/{id}/approval", mathSubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(chemistryModerator, Role.MODERATOR)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/library/contents/{id}/rejection", mathSubmittedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(chemistryModerator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Wrong subject\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/library/contents/{id}/approval", privateId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(mathModerator, Role.MODERATOR)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/library/contents/{id}/rejection", privateId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(mathModerator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Not submitted\"}"))
                .andExpect(status().isBadRequest());

        assertUnchangedReviewFields(submittedBefore, requireLibraryContent(mathSubmittedId));
        assertUnchangedReviewFields(privateBefore, requireLibraryContent(privateId));
        assertThat(count("activity_logs")).isEqualTo(beforeLogs);
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_hub_moderation_it");
        jdbc.execute("SET search_path TO edua_hub_moderation_it");
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
                CREATE TABLE IF NOT EXISTS library_contents (
                    id UUID PRIMARY KEY,
                    owner_id UUID NOT NULL,
                    type VARCHAR(20) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    subject VARCHAR(20),
                    status VARCHAR(20) NOT NULL,
                    payload JSONB NOT NULL,
                    thumbnail_url TEXT,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    submitted_at TIMESTAMPTZ,
                    deleted_at TIMESTAMPTZ,
                    reviewed_by UUID,
                    reviewed_at TIMESTAMPTZ,
                    rejection_reason TEXT
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
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS hub_content_comments (
                    id UUID PRIMARY KEY,
                    library_content_id UUID NOT NULL,
                    author_id UUID NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
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

    private UUID seedLibraryContent(String title, UUID ownerId, String type, Subject subject, String status, Instant deletedAt) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        boolean submitted = "SUBMITTED".equals(status) || "APPROVED".equals(status) || "REJECTED".equals(status);
        boolean reviewed = "APPROVED".equals(status) || "REJECTED".equals(status);
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url,
                    created_at, updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, '{"source":"hub-moderation-it"}'::jsonb, 'https://cdn.example/moderation.png',
                    ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'REJECTED' THEN 'Seed rejection' ELSE NULL END)
                """,
                id,
                ownerId,
                type,
                title,
                subject == null ? null : subject.name(),
                status,
                Timestamp.from(now),
                Timestamp.from(now),
                submitted ? Timestamp.from(now) : null,
                deletedAt == null ? null : Timestamp.from(deletedAt),
                reviewed ? ownerId : null,
                reviewed ? Timestamp.from(now) : null,
                status);
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_hub_moderation_it");
        jdbc.update("DELETE FROM hub_content_comments");
        jdbc.update("DELETE FROM activity_logs");
        jdbc.update("DELETE FROM library_contents");
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
                "library_contents", count("library_contents"),
                "activity_logs", count("activity_logs"),
                "hub_content_comments", count("hub_content_comments"));
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private int countActivity(String action) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM activity_logs WHERE action = ?", Integer.class, action);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireLibraryContent(UUID id) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE id = ?", id);
    }

    private void assertActivityLog(String action, UUID actorId, UUID targetId, String metadata) {
        Map<String, Object> log = jdbc.queryForMap(
                "SELECT * FROM activity_logs WHERE action = ? AND actor_id = ? AND target_id = ?",
                action,
                actorId,
                targetId);
        assertThat(log.get("actor_role")).isEqualTo("MODERATOR");
        assertThat(log.get("category")).isEqualTo("MODERATION");
        assertThat(log.get("target_type")).isEqualTo("LIBRARY_CONTENT");
        assertThat(log.get("metadata")).isEqualTo(metadata);
        assertThat(log.get("created_at")).isNotNull();
    }

    private void assertUnchangedReviewFields(Map<String, Object> before, Map<String, Object> after) {
        assertThat(after.get("status")).isEqualTo(before.get("status"));
        assertThat(after.get("reviewed_by")).isEqualTo(before.get("reviewed_by"));
        assertThat(after.get("reviewed_at")).isEqualTo(before.get("reviewed_at"));
        assertThat(after.get("rejection_reason")).isEqualTo(before.get("rejection_reason"));
        assertThat(after.get("deleted_at")).isEqualTo(before.get("deleted_at"));
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
