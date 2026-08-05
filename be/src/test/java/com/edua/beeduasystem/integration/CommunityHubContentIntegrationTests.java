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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_community_hub_content_it",
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
class CommunityHubContentIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@community-hub-content-it.edua.local";

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
    void IT_HC_001_guestViewsApprovedHubFeedOnly() throws Exception {
        AppUser owner = user("owner-001@community-hub-content-it.edua.local", "Hub Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Alpha Math Hub", owner.id(), "LESSON_PLAN", Subject.MATH, "APPROVED",
                "{\"source\":\"approved-alpha\"}", null);
        seedComment(approvedId, owner.id(), "Useful approved content");
        seedLibraryContent("Alpha Private Hub", owner.id(), "LESSON_PLAN", Subject.MATH, "PRIVATE",
                "{\"source\":\"private\"}", null);
        seedLibraryContent("Alpha Submitted Hub", owner.id(), "LESSON_PLAN", Subject.MATH, "SUBMITTED",
                "{\"source\":\"submitted\"}", null);
        seedLibraryContent("Alpha Rejected Hub", owner.id(), "LESSON_PLAN", Subject.MATH, "REJECTED",
                "{\"source\":\"rejected\"}", null);
        seedLibraryContent("Alpha Deleted Hub", owner.id(), "LESSON_PLAN", Subject.MATH, "APPROVED",
                "{\"source\":\"deleted\"}", Instant.now());
        seedLibraryContent("Beta Chemistry Hub", owner.id(), "SLIDE_DECK", Subject.CHEMISTRY, "APPROVED",
                "{\"source\":\"beta\"}", null);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/hub/contents?type=LESSON_PLAN&subject=MATH&q=Alpha&page=0&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Alpha Math Hub")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Alpha Private Hub"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Alpha Submitted Hub"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Alpha Rejected Hub"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Alpha Deleted Hub"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Beta Chemistry Hub"))))
                .andExpect(jsonPath("$.items[0].ownerName").value("Hub Owner"))
                .andExpect(jsonPath("$.items[0].commentCount").value(1))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_HC_002_guestOpensApprovedHubContentDetail() throws Exception {
        AppUser owner = user("owner-002@community-hub-content-it.edua.local", "Detail Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-002@community-hub-content-it.edua.local", "Comment Author", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Physics Detail Hub", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "APPROVED",
                "{\"sections\":[{\"title\":\"Motion\"}]}", null);
        UUID privateId = seedLibraryContent("Private Detail Hub", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "PRIVATE",
                "{\"sections\":[]}", null);
        seedComment(approvedId, commenter.id(), "Ready for class");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/hub/contents/{id}", approvedId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(approvedId.toString()))
                .andExpect(jsonPath("$.title").value("Physics Detail Hub"))
                .andExpect(jsonPath("$.type").value("LESSON_PLAN"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.ownerName").value("Detail Owner"))
                .andExpect(jsonPath("$.payload.sections[0].title").value("Motion"))
                .andExpect(jsonPath("$.comments[*].content", hasItem("Ready for class")))
                .andExpect(jsonPath("$.comments[*].authorName", hasItem("Comment Author")));

        mockMvc.perform(get("/api/hub/contents/{id}", privateId))
                .andExpect(status().isNotFound());

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_HC_003_teacherCustomizesApprovedContentIntoPersonalLibrary() throws Exception {
        AppUser owner = user("owner-003@community-hub-content-it.edua.local", "Source Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser teacher = user("teacher-003@community-hub-content-it.edua.local", "Copy Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID approvedId = seedLibraryContent("Chemistry Hub Deck", owner.id(), "SLIDE_DECK", Subject.CHEMISTRY, "APPROVED",
                "{\"slides\":[{\"title\":\"Atoms\"}]}", null);
        int beforeCopies = countCopiesForOwner(teacher.id(), "Chemistry Hub Deck (bản sao)");

        mockMvc.perform(post("/api/hub/contents/{id}/customize", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Chemistry Hub Deck (bản sao)"))
                .andExpect(jsonPath("$.type").value("SLIDE_DECK"))
                .andExpect(jsonPath("$.subject").value("CHEMISTRY"))
                .andExpect(jsonPath("$.status").value("PRIVATE"))
                .andExpect(jsonPath("$.payload.slides[0].title").value("Atoms"));

        assertThat(countCopiesForOwner(teacher.id(), "Chemistry Hub Deck (bản sao)")).isEqualTo(beforeCopies + 1);
        Map<String, Object> copy = requireLibraryContentByOwnerAndTitle(teacher.id(), "Chemistry Hub Deck (bản sao)");
        assertThat(copy.get("status")).isEqualTo("PRIVATE");
        assertThat(copy.get("owner_id")).isEqualTo(teacher.id());
        assertThat(copy.get("submitted_at")).isNull();
        assertThat(copy.get("reviewed_by")).isNull();
        assertThat(copy.get("reviewed_at")).isNull();
        assertThat(copy.get("rejection_reason")).isNull();

        Map<String, Object> original = requireLibraryContent(approvedId);
        assertThat(original.get("status")).isEqualTo("APPROVED");
        assertThat(original.get("owner_id")).isEqualTo(owner.id());
    }

    @Test
    void IT_HC_004_deniesCustomizeForGuestAndNonTeacherRoles() throws Exception {
        AppUser owner = user("owner-004@community-hub-content-it.edua.local", "Permission Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-004@community-hub-content-it.edua.local", "Student User", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser moderator = user("moderator-004@community-hub-content-it.edua.local", "Moderator User", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        UUID approvedId = seedLibraryContent("Permission Hub Content", owner.id(), "LESSON_PLAN", Subject.MATH, "APPROVED",
                "{\"source\":\"permission\"}", null);
        int beforeLibraryRows = count("library_contents");

        mockMvc.perform(post("/api/hub/contents/{id}/customize", approvedId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/hub/contents/{id}/customize", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/hub/contents/{id}/customize", approvedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isForbidden());

        assertThat(count("library_contents")).isEqualTo(beforeLibraryRows);
        assertThat(requireLibraryContent(approvedId).get("status")).isEqualTo("APPROVED");
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_community_hub_content_it");
        jdbc.execute("SET search_path TO edua_community_hub_content_it");
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

    private UUID seedLibraryContent(
            String title,
            UUID ownerId,
            String type,
            Subject subject,
            String status,
            String payload,
            Instant deletedAt) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        boolean reviewed = "APPROVED".equals(status) || "REJECTED".equals(status);
        boolean submitted = "SUBMITTED".equals(status) || reviewed;
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url,
                    created_at, updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, 'https://cdn.example/hub.png',
                    ?, ?, ?, ?, ?, ?, NULL)
                """,
                id,
                ownerId,
                type,
                title,
                subject == null ? null : subject.name(),
                status,
                payload,
                Timestamp.from(now),
                Timestamp.from(now),
                submitted ? Timestamp.from(now) : null,
                deletedAt == null ? null : Timestamp.from(deletedAt),
                reviewed ? ownerId : null,
                reviewed ? Timestamp.from(now) : null);
        return id;
    }

    private void seedComment(UUID libraryContentId, UUID authorId, String content) {
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO hub_content_comments (id, library_content_id, author_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), libraryContentId, authorId, content, Timestamp.from(now), Timestamp.from(now));
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_community_hub_content_it");
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

    private int countCopiesForOwner(UUID ownerId, String title) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM library_contents WHERE owner_id = ? AND title = ?",
                Integer.class,
                ownerId,
                title);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireLibraryContent(UUID id) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE id = ?", id);
    }

    private Map<String, Object> requireLibraryContentByOwnerAndTitle(UUID ownerId, String title) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE owner_id = ? AND title = ?", ownerId, title);
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
