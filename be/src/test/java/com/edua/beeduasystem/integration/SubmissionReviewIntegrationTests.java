package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
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
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        "spring.flyway.enabled=${IT_FLYWAY_ENABLED:false}",
        "spring.datasource.url=${IT_DB_URL:${DB_URL}}",
        "spring.datasource.username=${IT_DB_USERNAME:${DB_USERNAME}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${DB_PASSWORD}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_submission_review_it",
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
class SubmissionReviewIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@submission-review-it.edua.local";

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

    @MockBean
    private NotificationStreamPort notificationStreamPort;

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
    void IT_SR_001_ownerViewsSubmissionRosterWithAllStudentStatuses() throws Exception {
        AppUser owner = user("owner-001@submission-review-it.edua.local", "Roster Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser onTime = user("ontime-001@submission-review-it.edua.local", "Alice On Time", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser late = user("late-001@submission-review-it.edua.local", "Bob Late", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser missing = user("missing-001@submission-review-it.edua.local", "Charlie Missing", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Review Roster Class", Subject.MATH, 10, "ACTIVE");
        seedMember(classId, onTime.id());
        seedMember(classId, late.id());
        seedMember(classId, missing.id());
        Instant deadline = Instant.now().plusSeconds(86_400);
        UUID resourceId = seedResource(classId, owner.id(), "Roster Assignment", true, deadline);
        seedSubmission(resourceId, onTime.id(), "On time answer", "ON_TIME",
                Instant.now().minusSeconds(3_600), Instant.now().minusSeconds(1_800));
        seedSubmission(resourceId, late.id(), "Late answer", "LATE",
                Instant.now().minusSeconds(900), Instant.now().minusSeconds(300));

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resourceId").value(resourceId.toString()))
                .andExpect(jsonPath("$.deadline").exists())
                .andExpect(jsonPath("$.items", hasSize(3)))
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("ontime-001@submission-review-it.edua.local")))
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("late-001@submission-review-it.edua.local")))
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("missing-001@submission-review-it.edua.local")))
                .andExpect(jsonPath("$.items[*].status", hasItem("ON_TIME")))
                .andExpect(jsonPath("$.items[*].status", hasItem("LATE")))
                .andExpect(jsonPath("$.items[*].status", hasItem("NOT_SUBMITTED")));
    }

    @Test
    void IT_SR_002_ownerViewsStudentSubmissionDetailWithFilesAndEditedTimes() throws Exception {
        AppUser owner = user("owner-002@submission-review-it.edua.local", "Detail Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser student = user("student-002@submission-review-it.edua.local", "Detail Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Review Detail Class", Subject.CHEMISTRY, 11, "ACTIVE");
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Detail Assignment", true, Instant.now().plusSeconds(86_400));
        Instant firstSubmittedAt = Instant.now().minusSeconds(3_600);
        Instant latestSubmittedAt = Instant.now().minusSeconds(600);
        seedSubmission(resourceId, student.id(), "<p>Detailed answer</p>", "ON_TIME", firstSubmittedAt, latestSubmittedAt);

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions/{studentId}", classId, resourceId, student.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.studentId").value(student.id().toString()))
                .andExpect(jsonPath("$.studentName").value("Detail Student"))
                .andExpect(jsonPath("$.textContent").value("<p>Detailed answer</p>"))
                .andExpect(jsonPath("$.files[0].fileName").value("teacher-review.pdf"))
                .andExpect(jsonPath("$.files[0].contentType").value("application/pdf"))
                .andExpect(jsonPath("$.status").value("ON_TIME"))
                .andExpect(jsonPath("$.firstSubmittedAt").exists())
                .andExpect(jsonPath("$.submittedAt").exists());
    }

    @Test
    void IT_SR_003_deniesSubmissionReviewForGuestStudentNonOwnerAndInvalidResource() throws Exception {
        AppUser owner = user("owner-003@submission-review-it.edua.local", "Permission Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser enrolled = user("student-003@submission-review-it.edua.local", "Enrolled Student", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        AppUser strangerTeacher = user("teacher-003@submission-review-it.edua.local", "Stranger Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser principal = user("principal-003@submission-review-it.edua.local", "Principal Three", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        UUID classId = seedClass(owner.id(), "Protected Review Class", Subject.PHYSICS, 12, "ACTIVE");
        seedMember(classId, enrolled.id());
        UUID resourceId = seedResource(classId, owner.id(), "Protected Assignment", true, Instant.now().plusSeconds(86_400));
        UUID readingOnlyResourceId = seedResource(classId, owner.id(), "Reading Only", false, null);
        UUID submissionId = seedSubmission(resourceId, enrolled.id(), "Protected answer", "ON_TIME", Instant.now().minusSeconds(600), Instant.now().minusSeconds(600));

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(enrolled, Role.STUDENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, readingOnlyResourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions/{studentId}", classId, resourceId, UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isNotFound());

        assertThat(submissionExists(submissionId)).isTrue();
        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submissions", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("student-003@submission-review-it.edua.local")))
                .andExpect(jsonPath("$.items[*].status", not(hasItem("NOT_SUBMITTED"))));
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(), email, null, fullName, null, null, subject, status, Instant.now(), null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_submission_review_it");
        jdbc.execute("SET search_path TO edua_submission_review_it");
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
                CREATE TABLE IF NOT EXISTS classes (
                    id UUID PRIMARY KEY,
                    owner_id UUID NOT NULL REFERENCES app_users (id),
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
                CREATE TABLE IF NOT EXISTS class_members (
                    id UUID PRIMARY KEY,
                    class_id UUID NOT NULL REFERENCES classes (id),
                    student_id UUID NOT NULL REFERENCES app_users (id),
                    joined_at TIMESTAMPTZ NOT NULL,
                    UNIQUE (class_id, student_id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS class_resources (
                    id UUID PRIMARY KEY,
                    class_id UUID NOT NULL REFERENCES classes (id),
                    posted_by UUID NOT NULL REFERENCES app_users (id),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    source_type VARCHAR(20) NOT NULL,
                    source_library_content_id UUID,
                    thumbnail_url TEXT,
                    attachment_file_id VARCHAR(255),
                    attachment_url TEXT,
                    attachment_file_name VARCHAR(255),
                    attachment_content_type VARCHAR(255),
                    attachment_size_bytes BIGINT,
                    submission_enabled BOOLEAN NOT NULL DEFAULT FALSE,
                    deadline TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS submissions (
                    id UUID PRIMARY KEY,
                    class_resource_id UUID NOT NULL REFERENCES class_resources (id),
                    student_id UUID NOT NULL REFERENCES app_users (id),
                    text_content TEXT,
                    status VARCHAR(20) NOT NULL,
                    submitted_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    UNIQUE (class_resource_id, student_id)
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS submission_files (
                    id UUID PRIMARY KEY,
                    submission_id UUID NOT NULL REFERENCES submissions (id),
                    url TEXT NOT NULL,
                    file_name VARCHAR(255) NOT NULL,
                    content_type VARCHAR(255) NOT NULL,
                    size_bytes BIGINT NOT NULL
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

    private UUID seedClass(UUID ownerId, String name, Subject subject, int grade, String status) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO classes (id, owner_id, name, description, subject, grade, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, ownerId, name, "Review class", subject.name(), grade, status,
                Timestamp.from(now.minusSeconds(60)), Timestamp.from(now));
        return id;
    }

    private void seedMember(UUID classId, UUID studentId) {
        jdbc.update("""
                INSERT INTO class_members (id, class_id, student_id, joined_at)
                VALUES (?, ?, ?, ?)
                """, UUID.randomUUID(), classId, studentId, Timestamp.from(Instant.now()));
    }

    private UUID seedResource(UUID classId, UUID postedBy, String title, boolean submissionEnabled, Instant deadline) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO class_resources (
                    id, class_id, posted_by, title, description, source_type,
                    attachment_url, attachment_file_name, attachment_content_type, attachment_size_bytes,
                    submission_enabled, deadline, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, 'FILE_UPLOAD', ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                classId,
                postedBy,
                title,
                "Review resource",
                "https://cdn.example.test/review.pdf",
                "review.pdf",
                "application/pdf",
                1024L,
                submissionEnabled,
                deadline == null ? null : Timestamp.from(deadline),
                Timestamp.from(now.minusSeconds(30)),
                Timestamp.from(now));
        return id;
    }

    private UUID seedSubmission(UUID resourceId, UUID studentId, String textContent, String status,
                                Instant firstSubmittedAt, Instant submittedAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO submissions (id, class_resource_id, student_id, text_content, status, submitted_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                resourceId,
                studentId,
                textContent,
                status,
                Timestamp.from(submittedAt),
                Timestamp.from(firstSubmittedAt),
                Timestamp.from(submittedAt));
        jdbc.update("""
                INSERT INTO submission_files (id, submission_id, url, file_name, content_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                id,
                "https://cdn.example.test/teacher-review.pdf",
                "teacher-review.pdf",
                "application/pdf",
                2048L);
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_submission_review_it");
        jdbc.update("DELETE FROM submission_files");
        jdbc.update("DELETE FROM submissions");
        jdbc.update("DELETE FROM class_resources");
        jdbc.update("DELETE FROM class_members");
        jdbc.update("DELETE FROM classes WHERE owner_id IN (SELECT id FROM app_users WHERE email LIKE ?)", TEST_EMAIL_PATTERN);
        jdbc.update("DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM app_users WHERE email LIKE ?)", TEST_EMAIL_PATTERN);
        jdbc.update("""
                DELETE FROM user_roles
                WHERE user_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                   OR granted_by IN (SELECT id FROM app_users WHERE email LIKE ?)
                """, TEST_EMAIL_PATTERN, TEST_EMAIL_PATTERN);
        jdbc.update("DELETE FROM app_users WHERE email LIKE ?", TEST_EMAIL_PATTERN);
    }

    private boolean submissionExists(UUID submissionId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM submissions WHERE id = ?", Integer.class, submissionId);
        return count != null && count > 0;
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
