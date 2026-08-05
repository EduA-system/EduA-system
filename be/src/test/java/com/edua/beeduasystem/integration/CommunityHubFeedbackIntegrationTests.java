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
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=${IT_FLYWAY_ENABLED:false}",
        "spring.datasource.url=${IT_DB_URL:jdbc:postgresql://localhost:${POSTGRES_PORT:9118}/${POSTGRES_DB:edua_system}}",
        "spring.datasource.username=${IT_DB_USERNAME:${POSTGRES_USER:postgres}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${POSTGRES_PASSWORD:himawari}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_community_hub_feedback_it",
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
class CommunityHubFeedbackIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@community-hub-feedback-it.edua.local";

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
    void IT_HF_001_teacherCreatesCommentOnApprovedContent() throws Exception {
        AppUser owner = user("owner-001@community-hub-feedback-it.edua.local", "Hub Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser teacher = user("teacher-001@community-hub-feedback-it.edua.local", "Comment Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Approved Comment Target", owner.id(), "LESSON_PLAN", Subject.MATH, "APPROVED");
        int beforeCount = count("hub_content_comments");

        mockMvc.perform(post("/api/hub/contents/{id}/comments", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "<p>Useful <script>alert(1)</script><strong>comment</strong></p>"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorId").value(teacher.id().toString()))
                .andExpect(jsonPath("$.authorName").value("Comment Teacher"))
                .andExpect(jsonPath("$.content", containsString("Useful")))
                .andExpect(jsonPath("$.content", containsString("comment")));

        assertThat(count("hub_content_comments")).isEqualTo(beforeCount + 1);
        Map<String, Object> comment = requireSingleComment(approvedId);
        assertThat(comment.get("author_id")).isEqualTo(teacher.id());
        assertThat((String) comment.get("content")).contains("Useful", "comment").doesNotContain("script");

        mockMvc.perform(post("/api/hub/contents/{id}/comments", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(count("hub_content_comments")).isEqualTo(beforeCount + 1);
    }

    @Test
    void IT_HF_002_authorUpdatesOwnComment() throws Exception {
        AppUser owner = user("owner-002@community-hub-feedback-it.edua.local", "Owner Two", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser moderator = user("moderator-002@community-hub-feedback-it.edua.local", "Moderator Two", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        UUID approvedId = seedLibraryContent("Approved Update Target", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "APPROVED");
        UUID commentId = seedComment(approvedId, moderator.id(), "Original comment");
        Map<String, Object> before = requireComment(commentId);

        mockMvc.perform(patch("/api/hub/comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Updated own comment\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(commentId.toString()))
                .andExpect(jsonPath("$.content").value("Updated own comment"))
                .andExpect(jsonPath("$.authorId").value(moderator.id().toString()))
                .andExpect(jsonPath("$.authorName").value("Moderator Two"));

        Map<String, Object> after = requireComment(commentId);
        assertThat(after.get("content")).isEqualTo("Updated own comment");
        assertThat(after.get("author_id")).isEqualTo(before.get("author_id"));
        assertThat(after.get("library_content_id")).isEqualTo(before.get("library_content_id"));
    }

    @Test
    void IT_HF_003_authorDeletesOwnComment() throws Exception {
        AppUser owner = user("owner-003@community-hub-feedback-it.edua.local", "Owner Three", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser teacher = user("teacher-003@community-hub-feedback-it.edua.local", "Teacher Three", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Approved Delete Target", owner.id(), "SLIDE_DECK", Subject.CHEMISTRY, "APPROVED");
        UUID deleteId = seedComment(approvedId, teacher.id(), "Delete my own comment");
        UUID keepId = seedComment(approvedId, owner.id(), "Keep owner comment");

        mockMvc.perform(delete("/api/hub/comments/{commentId}", deleteId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(commentExists(deleteId)).isFalse();
        assertThat(commentExists(keepId)).isTrue();
    }

    @Test
    void IT_HF_004_contentOwnerDeletesCommentOnOwnContent() throws Exception {
        AppUser owner = user("owner-004@community-hub-feedback-it.edua.local", "Owner Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-004@community-hub-feedback-it.edua.local", "Commenter Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Owner Delete Target", owner.id(), "TEST", Subject.MATH, "APPROVED");
        UUID commentId = seedComment(approvedId, commenter.id(), "Comment on owner's content");

        mockMvc.perform(delete("/api/hub/comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(commentExists(commentId)).isFalse();
        Map<String, Object> content = requireLibraryContent(approvedId);
        assertThat(content.get("status")).isEqualTo("APPROVED");
        assertThat(content.get("owner_id")).isEqualTo(owner.id());
    }

    @Test
    void IT_HF_005_teacherReportsApprovedContent() throws Exception {
        AppUser owner = user("owner-005@community-hub-feedback-it.edua.local", "Owner Five", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser reporter = user("reporter-005@community-hub-feedback-it.edua.local", "Reporter Five", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        UUID approvedId = seedLibraryContent("Report Approved Target", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "APPROVED");
        UUID privateId = seedLibraryContent("Report Private Target", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "PRIVATE");
        int beforeReports = count("hub_content_reports");

        mockMvc.perform(post("/api/hub/contents/{id}/reports", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(reporter, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"  Duplicate content  \"}"))
                .andExpect(status().isNoContent());

        assertThat(count("hub_content_reports")).isEqualTo(beforeReports + 1);
        Map<String, Object> report = requireSingleReport(approvedId);
        assertThat(report.get("reporter_id")).isEqualTo(reporter.id());
        assertThat(report.get("reason")).isEqualTo("Duplicate content");
        assertThat(report.get("created_at")).isNotNull();

        mockMvc.perform(post("/api/hub/contents/{id}/reports", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(reporter, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/hub/contents/{id}/reports", privateId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(reporter, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Private content\"}"))
                .andExpect(status().isNotFound());

        assertThat(count("hub_content_reports")).isEqualTo(beforeReports + 1);
    }

    @Test
    void IT_HF_006_deniesGuestStudentAndOtherUserFeedbackActions() throws Exception {
        AppUser owner = user("owner-006@community-hub-feedback-it.edua.local", "Owner Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser author = user("author-006@community-hub-feedback-it.edua.local", "Author Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser stranger = user("stranger-006@community-hub-feedback-it.edua.local", "Stranger Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-006@community-hub-feedback-it.edua.local", "Student Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID approvedId = seedLibraryContent("Permission Feedback Target", owner.id(), "SIMULATION", Subject.CHEMISTRY, "APPROVED");
        UUID commentId = seedComment(approvedId, author.id(), "Protected comment");
        Map<String, Integer> beforeCounts = tableCounts();
        Map<String, Object> beforeComment = requireComment(commentId);

        mockMvc.perform(post("/api/hub/contents/{id}/comments", approvedId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Guest comment\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/hub/contents/{id}/reports", approvedId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Guest report\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/hub/contents/{id}/comments", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Student comment\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/hub/contents/{id}/reports", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Student report\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/hub/comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Unauthorized update\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/hub/comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER)))
                .andExpect(status().isForbidden());

        assertThat(tableCounts()).isEqualTo(beforeCounts);
        assertThat(requireComment(commentId).get("content")).isEqualTo(beforeComment.get("content"));
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_community_hub_feedback_it");
        jdbc.execute("SET search_path TO edua_community_hub_feedback_it");
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
                CREATE TABLE IF NOT EXISTS hub_content_comments (
                    id UUID PRIMARY KEY,
                    library_content_id UUID NOT NULL,
                    author_id UUID NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS hub_content_reports (
                    id UUID PRIMARY KEY,
                    library_content_id UUID NOT NULL,
                    reporter_id UUID NOT NULL,
                    reason TEXT NOT NULL,
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

    private UUID seedLibraryContent(String title, UUID ownerId, String type, Subject subject, String status) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        boolean reviewed = "APPROVED".equals(status) || "REJECTED".equals(status);
        boolean submitted = "SUBMITTED".equals(status) || reviewed;
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url,
                    created_at, updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, '{"source":"hub-feedback-it"}'::jsonb, 'https://cdn.example/feedback.png',
                    ?, ?, ?, NULL, ?, ?, NULL)
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
                reviewed ? ownerId : null,
                reviewed ? Timestamp.from(now) : null);
        return id;
    }

    private UUID seedComment(UUID libraryContentId, UUID authorId, String content) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO hub_content_comments (id, library_content_id, author_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, libraryContentId, authorId, content, Timestamp.from(now), Timestamp.from(now));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_community_hub_feedback_it");
        jdbc.update("DELETE FROM hub_content_reports");
        jdbc.update("DELETE FROM hub_content_comments");
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
                "hub_content_comments", count("hub_content_comments"),
                "hub_content_reports", count("hub_content_reports"));
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireLibraryContent(UUID id) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE id = ?", id);
    }

    private Map<String, Object> requireComment(UUID id) {
        return jdbc.queryForMap("SELECT * FROM hub_content_comments WHERE id = ?", id);
    }

    private Map<String, Object> requireSingleComment(UUID libraryContentId) {
        return jdbc.queryForMap("SELECT * FROM hub_content_comments WHERE library_content_id = ?", libraryContentId);
    }

    private Map<String, Object> requireSingleReport(UUID libraryContentId) {
        return jdbc.queryForMap("SELECT * FROM hub_content_reports WHERE library_content_id = ?", libraryContentId);
    }

    private boolean commentExists(UUID id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM hub_content_comments WHERE id = ?", Integer.class, id);
        return count != null && count > 0;
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
