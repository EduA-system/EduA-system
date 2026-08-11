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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_personal_library_it",
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
class PersonalLibraryIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@personal-library-it.edua.local";

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
    void IT_PL_001_listsAndSearchesOwnLibraryContent() throws Exception {
        AppUser teacher = user("teacher-001@personal-library-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-001@personal-library-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        seedLibraryContent("Alpha Math Lesson", teacher.id(), "LESSON_PLAN", Subject.MATH, "PRIVATE", "{\"source\":\"own-alpha\"}", null, null);
        seedLibraryContent("Beta Chemistry Slide", teacher.id(), "SLIDE_DECK", Subject.CHEMISTRY, "PRIVATE", "{\"source\":\"own-beta\"}", null, null);
        seedLibraryContent("Alpha Other Owner", otherTeacher.id(), "LESSON_PLAN", Subject.MATH, "PRIVATE", "{\"source\":\"other\"}", null, null);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents?type=LESSON_PLAN&subject=MATH&q=Alpha&page=0&size=20&sort=title")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Alpha Math Lesson")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Alpha Other Owner"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Beta Chemistry Slide"))))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_PL_002_ownerOpensLibraryContentDetail() throws Exception {
        AppUser teacher = user("teacher-002@personal-library-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Physics Detail", teacher.id(), "LESSON_PLAN", Subject.PHYSICS, "PRIVATE",
                "{\"sections\":[{\"title\":\"Intro\"}]}", null, null);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(contentId.toString()))
                .andExpect(jsonPath("$.title").value("Physics Detail"))
                .andExpect(jsonPath("$.type").value("LESSON_PLAN"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.status").value("PRIVATE"))
                .andExpect(jsonPath("$.payload.sections[0].title").value("Intro"));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_PL_003_teacherCreatesLibraryContent() throws Exception {
        AppUser teacher = user("teacher-003@personal-library-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);

        mockMvc.perform(post("/api/library/contents")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "LESSON_PLAN",
                                  "title": "  Created non-AI lesson  ",
                                  "subject": "PHYSICS",
                                  "payload": {
                                    "source": "manual-fixture",
                                    "steps": ["one"]
                                  },
                                  "thumbnailUrl": " https://cdn.example/thumb.png "
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Created non-AI lesson"))
                .andExpect(jsonPath("$.type").value("LESSON_PLAN"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.status").value("PRIVATE"))
                .andExpect(jsonPath("$.payload.source").value("manual-fixture"))
                .andExpect(jsonPath("$.thumbnailUrl").value("https://cdn.example/thumb.png"));

        Map<String, Object> row = requireLibraryContentByTitle("Created non-AI lesson");
        assertThat(row.get("owner_id")).isEqualTo(teacher.id());
        assertThat(row.get("status")).isEqualTo("PRIVATE");
        assertThat(row.get("deleted_at")).isNull();
    }

    @Test
    void IT_PL_004_ownerUpdatesLibraryContent() throws Exception {
        AppUser moderator = user("moderator-004@personal-library-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        UUID contentId = seedLibraryContent("Original Chemistry Title", moderator.id(), "SLIDE_DECK", Subject.CHEMISTRY, "PRIVATE",
                "{\"slides\":[{\"title\":\"Old\"}]}", null, null);

        mockMvc.perform(patch("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Updated Chemistry Deck",
                                  "subject": "CHEMISTRY",
                                  "payload": {
                                    "slides": [
                                      {"title": "Updated"}
                                    ]
                                  },
                                  "thumbnailUrl": "https://cdn.example/updated.png"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(contentId.toString()))
                .andExpect(jsonPath("$.title").value("Updated Chemistry Deck"))
                .andExpect(jsonPath("$.subject").value("CHEMISTRY"))
                .andExpect(jsonPath("$.status").value("PRIVATE"))
                .andExpect(jsonPath("$.payload.slides[0].title").value("Updated"))
                .andExpect(jsonPath("$.thumbnailUrl").value("https://cdn.example/updated.png"));

        Map<String, Object> row = requireLibraryContent(contentId);
        assertThat(row.get("title")).isEqualTo("Updated Chemistry Deck");
        assertThat(row.get("status")).isEqualTo("PRIVATE");
        assertThat(row.get("deleted_at")).isNull();
    }

    @Test
    void IT_PL_005_ownerSoftDeletesLibraryContent() throws Exception {
        AppUser teacher = user("teacher-005@personal-library-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Delete Me", teacher.id(), "TEST", Subject.MATH, "PRIVATE",
                "{\"questions\":[]}", null, null);

        mockMvc.perform(delete("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(requireLibraryContent(contentId).get("deleted_at")).isNotNull();

        mockMvc.perform(get("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNotFound());
    }

    @Test
    void IT_PL_006_ownerSubmitsPrivateOrRejectedContent() throws Exception {
        AppUser teacher = user("teacher-006@personal-library-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID privateContentId = seedLibraryContent("Private Submit", teacher.id(), "LESSON_PLAN", Subject.CHEMISTRY, "PRIVATE",
                "{\"source\":\"private\"}", null, null);
        UUID rejectedContentId = seedLibraryContent("Rejected Resubmit", teacher.id(), "SLIDE_DECK", Subject.CHEMISTRY, "REJECTED",
                "{\"source\":\"rejected\"}", null, "Needs more detail");

        mockMvc.perform(post("/api/library/contents/{id}/submission", privateContentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.submittedAt").exists());

        mockMvc.perform(post("/api/library/contents/{id}/submission", rejectedContentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.submittedAt").exists())
                .andExpect(jsonPath("$.rejectionReason").doesNotExist());

        assertSubmitted(privateContentId);
        assertSubmitted(rejectedContentId);
    }

    @Test
    void IT_PL_007_ownerUnsubmitsSubmittedContent() throws Exception {
        AppUser teacher = user("teacher-007@personal-library-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Withdraw Submission", teacher.id(), "SIMULATION", Subject.MATH, "SUBMITTED",
                "{\"simulation\":\"pendulum\"}", Instant.now(), null);

        mockMvc.perform(delete("/api/library/contents/{id}/submission", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PRIVATE"))
                .andExpect(jsonPath("$.submittedAt").doesNotExist());

        Map<String, Object> row = requireLibraryContent(contentId);
        assertThat(row.get("status")).isEqualTo("PRIVATE");
        assertThat(row.get("submitted_at")).isNull();
        assertThat(row.get("deleted_at")).isNull();
    }

    @Test
    void IT_PL_008_deniesAccessToAnotherUsersLibraryContent() throws Exception {
        AppUser owner = user("owner-008@personal-library-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser stranger = user("stranger-008@personal-library-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID contentId = seedLibraryContent("Owner Only", owner.id(), "LESSON_PLAN", Subject.PHYSICS, "SUBMITTED",
                "{\"source\":\"owner\"}", Instant.now(), null);
        Map<String, Object> before = requireLibraryContent(contentId);

        mockMvc.perform(get("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hacked\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/library/contents/{id}", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/library/contents/{id}/submission", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/library/contents/{id}/submission", contentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.TEACHER)))
                .andExpect(status().isForbidden());

        Map<String, Object> after = requireLibraryContent(contentId);
        assertThat(after.get("title")).isEqualTo(before.get("title"));
        assertThat(after.get("status")).isEqualTo(before.get("status"));
        assertThat(after.get("deleted_at")).isEqualTo(before.get("deleted_at"));
    }

    private AppUser user(String email, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(),
                email,
                null,
                email,
                null,
                null,
                null,
                null,
                subject,
                status,
                Instant.now(),
                null,
                null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_personal_library_it");
        jdbc.execute("SET search_path TO edua_personal_library_it");
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
            Instant submittedAt,
            String rejectionReason) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url,
                    created_at, updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, NULL, ?, ?, ?, NULL, ?, ?, ?)
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
                submittedAt == null ? null : Timestamp.from(submittedAt),
                rejectionReason == null ? null : UUID.randomUUID(),
                rejectionReason == null ? null : Timestamp.from(now),
                rejectionReason);
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_personal_library_it");
        jdbc.update("DELETE FROM library_contents");
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
                "library_contents", count("library_contents"),
                "activity_logs", count("activity_logs"));
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireLibraryContentByTitle(String title) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE title = ?", title);
    }

    private Map<String, Object> requireLibraryContent(UUID id) {
        return jdbc.queryForMap("SELECT * FROM library_contents WHERE id = ?", id);
    }

    private void assertSubmitted(UUID contentId) {
        Map<String, Object> row = requireLibraryContent(contentId);
        assertThat(row.get("status")).isEqualTo("SUBMITTED");
        assertThat(row.get("submitted_at")).isNotNull();
        assertThat(row.get("reviewed_by")).isNull();
        assertThat(row.get("reviewed_at")).isNull();
        assertThat(row.get("rejection_reason")).isNull();
        assertThat(row.get("deleted_at")).isNull();
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
