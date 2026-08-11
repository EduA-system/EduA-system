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

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_assignment_submission_it",
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
class AssignmentSubmissionIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@assignment-submission-it.edua.local";

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
    void IT_AS_001_enrolledStudentSubmitsAssignmentWithTextAndFiles() throws Exception {
        AppUser owner = user("owner-001@assignment-submission-it.edua.local", "Assignment Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-001@assignment-submission-it.edua.local", "Student One", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Algebra Submission Class", Subject.MATH, 10, "ACTIVE");
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Algebra Assignment", true, Instant.now().plusSeconds(86_400));
        int beforeSubmissions = count("submissions");
        int beforeFiles = count("submission_files");

        String response = mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "textContent": "<p>My algebra answer</p><script>alert('x')</script>",
                                  "files": [
                                    {
                                      "url": "https://cdn.example.test/submission.pdf",
                                      "fileName": "submission.pdf",
                                      "contentType": "application/pdf",
                                      "sizeBytes": 2048
                                    }
                                  ]
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.textContent", containsString("My algebra answer")))
                .andExpect(jsonPath("$.textContent", not(containsString("<script"))))
                .andExpect(jsonPath("$.files[0].fileName").value("submission.pdf"))
                .andExpect(jsonPath("$.status").value("ON_TIME"))
                .andReturn().getResponse().getContentAsString();

        UUID submissionId = UUID.fromString(objectMapper.readTree(response).path("id").asText());
        assertThat(count("submissions")).isEqualTo(beforeSubmissions + 1);
        assertThat(count("submission_files")).isEqualTo(beforeFiles + 1);
        Map<String, Object> submission = requireSubmission(submissionId);
        assertThat(submission.get("class_resource_id")).isEqualTo(resourceId);
        assertThat(submission.get("student_id")).isEqualTo(student.id());
        assertThat(submission.get("status")).isEqualTo("ON_TIME");
        assertThat((String) submission.get("text_content")).contains("My algebra answer").doesNotContain("<script");
        assertThat(requireSingleSubmissionFile(submissionId).get("file_name")).isEqualTo("submission.pdf");

        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"textContent\":\"   \",\"files\":[]}"))
                .andExpect(status().isBadRequest());

        assertThat(count("submissions")).isEqualTo(beforeSubmissions + 1);
    }

    @Test
    void IT_AS_002_enrolledStudentViewsOwnSubmission() throws Exception {
        AppUser owner = user("owner-002@assignment-submission-it.edua.local", "View Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser student = user("student-002@assignment-submission-it.edua.local", "Student Two", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        AppUser otherStudent = user("other-002@assignment-submission-it.edua.local", "Other Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Chemistry Submission Class", Subject.CHEMISTRY, 11, "ACTIVE");
        seedMember(classId, student.id());
        seedMember(classId, otherStudent.id());
        UUID resourceId = seedResource(classId, owner.id(), "Chemistry Assignment", true, Instant.now().plusSeconds(86_400));
        seedSubmission(resourceId, student.id(), "Own chemistry answer", "ON_TIME", Instant.now());

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.textContent").value("Own chemistry answer"))
                .andExpect(jsonPath("$.status").value("ON_TIME"))
                .andExpect(jsonPath("$.files[0].fileName").value("answer.pdf"));

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherStudent, Role.STUDENT)))
                .andExpect(status().isNotFound());
    }

    @Test
    void IT_AS_003_enrolledStudentWithdrawsSubmission() throws Exception {
        AppUser owner = user("owner-003@assignment-submission-it.edua.local", "Withdraw Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-003@assignment-submission-it.edua.local", "Student Three", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Physics Submission Class", Subject.PHYSICS, 12, "ACTIVE");
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Physics Assignment", true, Instant.now().plusSeconds(86_400));
        UUID submissionId = seedSubmission(resourceId, student.id(), "Withdraw me", "ON_TIME", Instant.now());
        int beforeFiles = count("submission_files");

        mockMvc.perform(delete("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isNoContent());

        assertThat(submissionExists(submissionId)).isFalse();
        assertThat(count("submission_files")).isEqualTo(beforeFiles - 1);

        mockMvc.perform(get("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isNotFound());
    }

    @Test
    void IT_AS_004_enrolledStudentSubmitsAfterDeadlineAsLate() throws Exception {
        AppUser owner = user("owner-004@assignment-submission-it.edua.local", "Late Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-004@assignment-submission-it.edua.local", "Student Four", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Late Submission Class", Subject.MATH, 10, "ACTIVE");
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Late Assignment", true, Instant.now().minusSeconds(60));

        String response = mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"textContent\":\"<p>Late answer</p>\",\"files\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("LATE"))
                .andReturn().getResponse().getContentAsString();

        UUID submissionId = UUID.fromString(objectMapper.readTree(response).path("id").asText());
        assertThat(requireSubmission(submissionId).get("status")).isEqualTo("LATE");
    }

    @Test
    void IT_AS_005_deniesAssignmentSubmissionForInvalidAccessAndInvalidResources() throws Exception {
        AppUser owner = user("owner-005@assignment-submission-it.edua.local", "Deny Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser enrolled = user("student-005@assignment-submission-it.edua.local", "Enrolled Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        AppUser stranger = user("stranger-005@assignment-submission-it.edua.local", "Stranger Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-005@assignment-submission-it.edua.local", "Principal Five", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        UUID classId = seedClass(owner.id(), "Denied Submission Class", Subject.CHEMISTRY, 11, "ACTIVE");
        UUID inactiveClassId = seedClass(owner.id(), "Inactive Submission Class", Subject.CHEMISTRY, 11, "INACTIVE");
        seedMember(classId, enrolled.id());
        seedMember(inactiveClassId, enrolled.id());
        UUID resourceId = seedResource(classId, owner.id(), "Accepted Assignment", true, Instant.now().plusSeconds(86_400));
        UUID nonSubmittableResourceId = seedResource(classId, owner.id(), "Reading Only Resource", false, null);
        UUID inactiveResourceId = seedResource(inactiveClassId, owner.id(), "Inactive Assignment", true, Instant.now().plusSeconds(86_400));
        String payload = "{\"textContent\":\"<p>Should not submit</p>\",\"files\":[]}";
        int beforeSubmissions = count("submissions");

        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", classId, nonSubmittableResourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(enrolled, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources/{resourceId}/submission", inactiveClassId, inactiveResourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(enrolled, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());

        assertThat(count("submissions")).isEqualTo(beforeSubmissions);
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(), email, null, fullName, null, null, null, null, subject, status, Instant.now(), null, null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_assignment_submission_it");
        jdbc.execute("SET search_path TO edua_assignment_submission_it");
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
                id, ownerId, name, "Submission class", subject.name(), grade, status,
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
                "Assignment resource",
                "https://cdn.example.test/assignment.pdf",
                "assignment.pdf",
                "application/pdf",
                1024L,
                submissionEnabled,
                deadline == null ? null : Timestamp.from(deadline),
                Timestamp.from(now.minusSeconds(30)),
                Timestamp.from(now));
        return id;
    }

    private UUID seedSubmission(UUID resourceId, UUID studentId, String textContent, String status, Instant submittedAt) {
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
                Timestamp.from(submittedAt.minusSeconds(10)),
                Timestamp.from(submittedAt));
        jdbc.update("""
                INSERT INTO submission_files (id, submission_id, url, file_name, content_type, size_bytes)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                id,
                "https://cdn.example.test/answer.pdf",
                "answer.pdf",
                "application/pdf",
                1024L);
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_assignment_submission_it");
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

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireSubmission(UUID submissionId) {
        return jdbc.queryForMap("SELECT * FROM submissions WHERE id = ?", submissionId);
    }

    private Map<String, Object> requireSingleSubmissionFile(UUID submissionId) {
        return jdbc.queryForMap("SELECT * FROM submission_files WHERE submission_id = ?", submissionId);
    }

    private boolean submissionExists(UUID submissionId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM submissions WHERE id = ?", Integer.class, submissionId);
        return count != null && count > 0;
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
