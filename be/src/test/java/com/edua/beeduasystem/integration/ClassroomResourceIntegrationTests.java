package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_classroom_resource_it",
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
class ClassroomResourceIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@classroom-resource-it.edua.local";

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
    void IT_CR_001_ownerPostsFileUploadResource() throws Exception {
        AppUser owner = user("owner-001@classroom-resource-it.edua.local", "Resource Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-001@classroom-resource-it.edua.local", "Student One", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Algebra Resource Class", "Resource target", Subject.MATH, 10, "ACTIVE", Instant.now());
        seedMember(classId, student.id());
        Instant deadline = Instant.now().plusSeconds(86_400);
        int beforeResources = count("class_resources");

        String response = mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "  Algebra worksheet  ",
                                  "description": "  Week 1 practice  ",
                                  "sourceType": "FILE_UPLOAD",
                                  "attachment": {
                                    "url": "https://cdn.example.test/algebra.pdf",
                                    "fileName": "algebra.pdf",
                                    "contentType": "application/pdf",
                                    "sizeBytes": 2048
                                  },
                                  "submissionEnabled": true,
                                  "deadline": "%s"
                                }
                                """.formatted(deadline)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Algebra worksheet"))
                .andExpect(jsonPath("$.description").value("Week 1 practice"))
                .andExpect(jsonPath("$.sourceType").value("FILE_UPLOAD"))
                .andExpect(jsonPath("$.attachment.fileName").value("algebra.pdf"))
                .andExpect(jsonPath("$.submissionEnabled").value(true))
                .andExpect(jsonPath("$.postedByName").value("Resource Owner"))
                .andReturn().getResponse().getContentAsString();

        UUID resourceId = UUID.fromString(objectMapper.readTree(response).path("id").asText());
        assertThat(count("class_resources")).isEqualTo(beforeResources + 1);
        Map<String, Object> resource = requireResource(resourceId);
        assertThat(resource.get("class_id")).isEqualTo(classId);
        assertThat(resource.get("posted_by")).isEqualTo(owner.id());
        assertThat(resource.get("title")).isEqualTo("Algebra worksheet");
        assertThat(resource.get("description")).isEqualTo("Week 1 practice");
        assertThat(resource.get("source_type")).isEqualTo("FILE_UPLOAD");
        assertThat(resource.get("attachment_file_name")).isEqualTo("algebra.pdf");
        assertThat(resource.get("submission_enabled")).isEqualTo(true);
        assertResourceNotification(owner.id(), student.id(), "Tai lieu lop Algebra Resource Class");
        verify(notificationStreamPort).publishNew(eq(student.id()), any(NotificationEvent.class));

        mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "   ",
                                  "sourceType": "FILE_UPLOAD",
                                  "attachment": {"url": "https://cdn.example.test/blank.pdf"}
                                }
                                """))
                .andExpect(status().isBadRequest());

        assertThat(count("class_resources")).isEqualTo(beforeResources + 1);
    }

    @Test
    void IT_CR_002_ownerAndEnrolledStudentListResources() throws Exception {
        AppUser owner = user("owner-002@classroom-resource-it.edua.local", "List Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser student = user("student-002@classroom-resource-it.edua.local", "List Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Chemistry Resource Class", "List target", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        seedMember(classId, student.id());
        UUID older = seedResource(classId, owner.id(), "Older Reading", "Read first", false, null, Instant.now().minusSeconds(90));
        UUID newer = seedResource(classId, owner.id(), "Newer Assignment", "Latest resource", true, Instant.now().plusSeconds(86_400), Instant.now());

        mockMvc.perform(get("/api/classes/{id}/resources?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].id").value(newer.toString()))
                .andExpect(jsonPath("$.items[*].title", hasItem("Older Reading")))
                .andExpect(jsonPath("$.items[*].title", hasItem("Newer Assignment")))
                .andExpect(jsonPath("$.items[0].submissionStatus").value("NOT_APPLICABLE"));

        mockMvc.perform(get("/api/classes/{id}/resources?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].title", hasItem("Newer Assignment")))
                .andExpect(jsonPath("$.items[*].title", hasItem("Older Reading")))
                .andExpect(jsonPath("$.items[0].submissionStatus").value("NOT_SUBMITTED"));
    }

    @Test
    void IT_CR_003_viewResourceDetailFromClassResourceList() throws Exception {
        AppUser owner = user("owner-003@classroom-resource-it.edua.local", "Detail Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-003@classroom-resource-it.edua.local", "Detail Student", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        AppUser stranger = user("stranger-003@classroom-resource-it.edua.local", "Stranger", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Physics Resource Class", "Detail target", Subject.PHYSICS, 12, "ACTIVE", Instant.now());
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Physics lab detail", "Lab guide detail", true, Instant.now().plusSeconds(86_400), Instant.now());

        mockMvc.perform(get("/api/classes/{id}/resources?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(resourceId.toString()))
                .andExpect(jsonPath("$.items[0].title").value("Physics lab detail"))
                .andExpect(jsonPath("$.items[0].description").value("Lab guide detail"))
                .andExpect(jsonPath("$.items[0].attachment.fileName").value("resource.pdf"))
                .andExpect(jsonPath("$.items[0].postedByName").value("Detail Owner"));

        mockMvc.perform(get("/api/classes/{id}/resources?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void IT_CR_004_ownerUpdatesResourceInformationAndAssignmentSettings() throws Exception {
        AppUser owner = user("owner-004@classroom-resource-it.edua.local", "Update Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-004@classroom-resource-it.edua.local", "Update Student", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Math Update Resource Class", "Update target", Subject.MATH, 10, "ACTIVE", Instant.now());
        seedMember(classId, student.id());
        UUID resourceId = seedResource(classId, owner.id(), "Old resource title", "Old description", false, null, Instant.now());
        Instant deadline = Instant.now().plusSeconds(172_800);

        mockMvc.perform(patch("/api/classes/{id}/resources/{resourceId}", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Updated resource title",
                                  "description": "Updated resource description",
                                  "attachment": {
                                    "url": "https://cdn.example.test/updated.pdf",
                                    "fileName": "updated.pdf",
                                    "contentType": "application/pdf",
                                    "sizeBytes": 4096
                                  },
                                  "submissionEnabled": true,
                                  "deadline": "%s"
                                }
                                """.formatted(deadline)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated resource title"))
                .andExpect(jsonPath("$.description").value("Updated resource description"))
                .andExpect(jsonPath("$.attachment.fileName").value("updated.pdf"))
                .andExpect(jsonPath("$.submissionEnabled").value(true));

        Map<String, Object> updated = requireResource(resourceId);
        assertThat(updated.get("title")).isEqualTo("Updated resource title");
        assertThat(updated.get("description")).isEqualTo("Updated resource description");
        assertThat(updated.get("attachment_file_name")).isEqualTo("updated.pdf");
        assertThat(updated.get("submission_enabled")).isEqualTo(true);
        assertResourceNotification(owner.id(), student.id(), "Tai lieu lop Math Update Resource Class");
        verify(notificationStreamPort).publishNew(eq(student.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_CR_005_ownerDeletesResource() throws Exception {
        AppUser owner = user("owner-005@classroom-resource-it.edua.local", "Delete Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        UUID classId = seedClass(owner.id(), "Chemistry Delete Resource Class", "Delete target", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        UUID resourceId = seedResource(classId, owner.id(), "Delete me", "Delete target", false, null, Instant.now());
        int beforeResources = count("class_resources");

        mockMvc.perform(delete("/api/classes/{id}/resources/{resourceId}", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isNoContent());

        assertThat(count("class_resources")).isEqualTo(beforeResources - 1);
        assertThat(resourceExists(resourceId)).isFalse();

        mockMvc.perform(get("/api/classes/{id}/resources?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Delete me"))));
    }

    @Test
    void IT_CR_006_deniesResourceWritesForGuestWrongRoleStrangerAndInactiveClass() throws Exception {
        AppUser owner = user("owner-006@classroom-resource-it.edua.local", "Permission Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-006@classroom-resource-it.edua.local", "Student Six", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-006@classroom-resource-it.edua.local", "Principal Six", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser strangerTeacher = user("teacher-006@classroom-resource-it.edua.local", "Stranger Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Protected Resource Class", "Protected", Subject.PHYSICS, 12, "ACTIVE", Instant.now());
        UUID inactiveClassId = seedClass(owner.id(), "Inactive Resource Class", "Inactive", Subject.PHYSICS, 12, "INACTIVE", Instant.now());
        UUID resourceId = seedResource(classId, owner.id(), "Protected resource", "Protected", false, null, Instant.now());
        String payload = """
                {
                  "title": "Denied resource",
                  "sourceType": "FILE_UPLOAD",
                  "attachment": {"url": "https://cdn.example.test/denied.pdf"}
                }
                """;
        int beforeResources = count("class_resources");

        mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/resources", inactiveClassId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/classes/{id}/resources/{resourceId}", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Wrong owner update\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/classes/{id}/resources/{resourceId}", classId, resourceId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER)))
                .andExpect(status().isForbidden());

        assertThat(count("class_resources")).isEqualTo(beforeResources);
        assertThat(requireResource(resourceId).get("title")).isEqualTo("Protected resource");
        verifyNoInteractions(notificationStreamPort);
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(), email, null, fullName, null, null, subject, status, Instant.now(), null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_classroom_resource_it");
        jdbc.execute("SET search_path TO edua_classroom_resource_it");
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
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id UUID PRIMARY KEY,
                    sender_id UUID NOT NULL,
                    subject VARCHAR(20) NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    content VARCHAR(2000) NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS notification_recipients (
                    id UUID PRIMARY KEY,
                    notification_id UUID NOT NULL,
                    recipient_id UUID NOT NULL,
                    read_at TIMESTAMPTZ,
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

    private UUID seedClass(UUID ownerId, String name, String description, Subject subject, int grade, String status, Instant updatedAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO classes (id, owner_id, name, description, subject, grade, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, ownerId, name, description, subject.name(), grade, status,
                Timestamp.from(updatedAt.minusSeconds(60)), Timestamp.from(updatedAt));
        return id;
    }

    private void seedMember(UUID classId, UUID studentId) {
        jdbc.update("""
                INSERT INTO class_members (id, class_id, student_id, joined_at)
                VALUES (?, ?, ?, ?)
                """, UUID.randomUUID(), classId, studentId, Timestamp.from(Instant.now()));
    }

    private UUID seedResource(UUID classId, UUID postedBy, String title, String description,
                              boolean submissionEnabled, Instant deadline, Instant createdAt) {
        UUID id = UUID.randomUUID();
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
                description,
                "https://cdn.example.test/resource.pdf",
                "resource.pdf",
                "application/pdf",
                1024L,
                submissionEnabled,
                deadline == null ? null : Timestamp.from(deadline),
                Timestamp.from(createdAt),
                Timestamp.from(createdAt));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_classroom_resource_it");
        jdbc.update("DELETE FROM submission_files");
        jdbc.update("DELETE FROM submissions");
        jdbc.update("DELETE FROM notification_recipients");
        jdbc.update("DELETE FROM notifications");
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

    private Map<String, Object> requireResource(UUID resourceId) {
        return jdbc.queryForMap("SELECT * FROM class_resources WHERE id = ?", resourceId);
    }

    private boolean resourceExists(UUID resourceId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM class_resources WHERE id = ?", Integer.class, resourceId);
        return count != null && count > 0;
    }

    private UUID requireSingleNotificationId(String title) {
        return jdbc.queryForObject("SELECT id FROM notifications WHERE title = ?", UUID.class, title);
    }

    private void assertResourceNotification(UUID senderId, UUID recipientId, String title) {
        UUID notificationId = requireSingleNotificationId(title);
        Map<String, Object> notification = jdbc.queryForMap("SELECT * FROM notifications WHERE id = ?", notificationId);
        assertThat(notification.get("sender_id")).isEqualTo(senderId);
        List<UUID> recipients = jdbc.queryForList(
                "SELECT recipient_id FROM notification_recipients WHERE notification_id = ?",
                UUID.class,
                notificationId);
        assertThat(recipients).containsExactly(recipientId);
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
