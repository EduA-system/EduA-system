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
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_rbac_it",
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
class RoleBasedAccessControlIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@rbac-it.edua.local";
    private static final LocalDate WEEK_START = LocalDate.of(2026, 7, 27);

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
    void IT_RBAC_001_teacherAccessesLibraryApis() throws Exception {
        AppUser teacher = user("teacher-001@rbac-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        seedLibraryContent("teacher-library-001", teacher.id(), Subject.MATH, "PRIVATE");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("teacher-library-001")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_002_teacherAccessesClassroomApis() throws Exception {
        AppUser teacher = user("teacher-002@rbac-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        seedClass("teacher-class-002", teacher.id(), Subject.CHEMISTRY);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/classes?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].name", hasItem("teacher-class-002")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_003_teacherAccessesWeeklyScheduleApis() throws Exception {
        AppUser moderator = user("moderator-003@rbac-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-003@rbac-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER, moderator);
        seedWeeklyTask("weekly-task-003", moderator.id(), teacher.id(), Subject.PHYSICS, "NOT_SUBMITTED");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/weekly-tasks?from=2026-07-27&to=2026-07-27")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeks[0].weekStartDate").value("2026-07-27"))
                .andExpect(jsonPath("$.weeks[0].tasks[0].scopeDescription").value("weekly-task-003"));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_004_moderatorAccessesHubModerationApis() throws Exception {
        AppUser moderator = user("moderator-004@rbac-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-004@rbac-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, moderator);
        seedLibraryContent("submitted-content-004", teacher.id(), Subject.CHEMISTRY, "SUBMITTED");
        seedLibraryContent("other-subject-content-004", teacher.id(), Subject.MATH, "SUBMITTED");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents/moderation-queue?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("submitted-content-004")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_005_moderatorAccessesLessonApprovalApis() throws Exception {
        AppUser moderator = user("moderator-005@rbac-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-005@rbac-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, moderator);
        seedWeeklyTask("submitted-weekly-task-005", moderator.id(), teacher.id(), Subject.MATH, "SUBMITTED");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/weekly-tasks/moderation-queue?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].scopeDescription", hasItem("submitted-weekly-task-005")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_006_moderatorAccessesTeacherManagementApis() throws Exception {
        AppUser moderator = user("moderator-006@rbac-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        user("teacher-006@rbac-it.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER, moderator);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/moderator/teachers?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("teacher-006@rbac-it.edua.local")))
                .andExpect(jsonPath("$.content[*].subject", hasItem("PHYSICS")));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_007_principalAccessesPrincipalApis() throws Exception {
        AppUser principal = user("principal-007@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        user("moderator-007@rbac-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);
        user("it-007@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/principal/moderators?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("moderator-007@rbac-it.edua.local")));
        mockMvc.perform(get("/api/principal/it-staff?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("it-007@rbac-it.edua.local")));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_008_itStaffAccessesActivityLogApis() throws Exception {
        AppUser principal = user("principal-008@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser itStaff = user("it-008@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);
        seedActivityLog(itStaff.id(), "IT_STAFF", "ACCOUNT", "GRANT_IT_STAFF");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/it-staff/activity-log?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(itStaff, Role.IT_STAFF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].actorRole", hasItem("IT_STAFF")))
                .andExpect(jsonPath("$.items[*].action", hasItem("GRANT_IT_STAFF")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_009_wrongRoleUsersAreDeniedProtectedApis() throws Exception {
        AppUser principal = user("principal-009@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("moderator-009@rbac-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser teacher = user("teacher-009@rbac-it.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, moderator);
        AppUser itStaff = user("it-009@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);
        AppUser student = user("student-009@rbac-it.edua.local", null, UserStatus.ACTIVE, Role.STUDENT, principal);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents/moderation-queue")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/weekly-tasks/moderation-queue")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/principal/moderators")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/it-staff/activity-log")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/moderator/teachers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(itStaff, Role.IT_STAFF)))
                .andExpect(status().isForbidden());

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_RBAC_010_guestUsersAreDeniedProtectedApisIncludingCommunityHub() throws Exception {
        AppUser teacher = user("teacher-010@rbac-it.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        seedLibraryContent("approved-public-content-010", teacher.id(), Subject.MATH, "APPROVED");
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/library/contents"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/principal/moderators"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/hub/contents?page=0&size=20"))
                .andExpect(status().isUnauthorized());

        assertThat(tableCounts()).isEqualTo(before);
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

    private AppUser user(String email, Subject subject, UserStatus status, Role role, AppUser grantedBy) {
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
        userRoleRepository.replaceRole(user.id(), role, grantedBy.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_rbac_it");
        jdbc.execute("SET search_path TO edua_rbac_it");
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
                CREATE TABLE IF NOT EXISTS class_members (
                    id UUID PRIMARY KEY,
                    class_id UUID NOT NULL,
                    student_id UUID NOT NULL,
                    joined_at TIMESTAMPTZ NOT NULL
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
                    rejection_reason TEXT,
                    source_library_content_id UUID
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS classes (
                    id UUID PRIMARY KEY,
                    owner_id UUID NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    subject VARCHAR(20) NOT NULL,
                    grade INTEGER NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS weekly_tasks (
                    id UUID PRIMARY KEY,
                    moderator_id UUID NOT NULL,
                    subject VARCHAR(20) NOT NULL,
                    teacher_id UUID NOT NULL,
                    week_start_date DATE NOT NULL,
                    scope_description TEXT NOT NULL,
                    deadline TIMESTAMPTZ NOT NULL,
                    review_status VARCHAR(20) NOT NULL,
                    source_library_content_id UUID,
                    source_document_url TEXT,
                    source_document_name TEXT,
                    submitted_at TIMESTAMPTZ,
                    reviewed_by UUID,
                    reviewed_at TIMESTAMPTZ,
                    rejection_reason TEXT,
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

    private void seedLibraryContent(String title, UUID ownerId, Subject subject, String status) {
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url,
                    created_at, updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, 'LESSON_PLAN', ?, ?, ?, '{"source":"rbac-it"}'::jsonb, NULL,
                    now(), now(), CASE WHEN ? IN ('SUBMITTED', 'APPROVED') THEN now() ELSE NULL END,
                    NULL, NULL, NULL, NULL)
                """, UUID.randomUUID(), ownerId, title, subject.name(), status, status);
    }

    private void seedClass(String name, UUID ownerId, Subject subject) {
        jdbc.update("""
                INSERT INTO classes (id, owner_id, name, description, subject, grade, status, created_at, updated_at)
                VALUES (?, ?, ?, 'RBAC integration class', ?, 10, 'ACTIVE', now(), now())
                """, UUID.randomUUID(), ownerId, name, subject.name());
    }

    private void seedWeeklyTask(String scopeDescription, UUID moderatorId, UUID teacherId, Subject subject, String status) {
        jdbc.update("""
                INSERT INTO weekly_tasks (
                    id, moderator_id, subject, teacher_id, week_start_date, scope_description, deadline,
                    review_status, source_library_content_id, source_document_url, source_document_name,
                    submitted_at, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL,
                    CASE WHEN ? = 'SUBMITTED' THEN now() ELSE NULL END,
                    NULL, NULL, NULL, now(), now())
                """,
                UUID.randomUUID(),
                moderatorId,
                subject.name(),
                teacherId,
                WEEK_START,
                scopeDescription,
                Timestamp.from(Instant.parse("2026-08-03T17:00:00Z")),
                status,
                status);
    }

    private void seedActivityLog(UUID actorId, String actorRole, String category, String action) {
        jdbc.update("""
                INSERT INTO activity_logs (
                    id, actor_id, actor_role, category, action, target_type, target_id, metadata, created_at
                )
                VALUES (?, ?, ?, ?, ?, 'USER', ?, '{"source":"rbac-it"}', now())
                """, UUID.randomUUID(), actorId, actorRole, category, action, actorId);
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_rbac_it");
        jdbc.update("DELETE FROM hub_content_comments");
        jdbc.update("DELETE FROM class_members");
        jdbc.update("DELETE FROM weekly_tasks");
        jdbc.update("DELETE FROM classes");
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
                "hub_content_comments", count("hub_content_comments"),
                "classes", count("classes"),
                "class_members", count("class_members"),
                "weekly_tasks", count("weekly_tasks"),
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
