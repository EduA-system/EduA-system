package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
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

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_classroom_crud_it",
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
class ClassroomCrudIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@classroom-crud-it.edua.local";

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
    void IT_CC_001_teacherCreatesClass() throws Exception {
        AppUser teacher = user("teacher-001@classroom-crud-it.edua.local", "Math Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        int beforeClasses = count("classes");

        String response = mockMvc.perform(post("/api/classes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "  Algebra 10A  ",
                                  "subject": "MATH",
                                  "grade": 10,
                                  "description": "  First semester algebra class  "
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Algebra 10A"))
                .andExpect(jsonPath("$.description").value("First semester algebra class"))
                .andExpect(jsonPath("$.subject").value("MATH"))
                .andExpect(jsonPath("$.grade").value(10))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerId").value(teacher.id().toString()))
                .andExpect(jsonPath("$.ownerName").value("Math Teacher"))
                .andExpect(jsonPath("$.memberCount").value(1))
                .andReturn().getResponse().getContentAsString();

        UUID createdId = UUID.fromString(objectMapper.readTree(response).path("id").asText());
        assertThat(count("classes")).isEqualTo(beforeClasses + 1);
        Map<String, Object> created = requireClass(createdId);
        assertThat(created.get("owner_id")).isEqualTo(teacher.id());
        assertThat(created.get("name")).isEqualTo("Algebra 10A");
        assertThat(created.get("description")).isEqualTo("First semester algebra class");
        assertThat(created.get("subject")).isEqualTo("MATH");
        assertThat(created.get("grade")).isEqualTo(10);
        assertThat(created.get("status")).isEqualTo("ACTIVE");

        mockMvc.perform(post("/api/classes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "   ",
                                  "subject": "MATH",
                                  "grade": 10,
                                  "description": "Invalid class"
                                }
                                """))
                .andExpect(status().isBadRequest());

        assertThat(count("classes")).isEqualTo(beforeClasses + 1);
    }

    @Test
    void IT_CC_002_teacherListsOwnedClassesWithFilters() throws Exception {
        AppUser owner = user("owner-002@classroom-crud-it.edua.local", "Owner Two", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherOwner = user("other-002@classroom-crud-it.edua.local", "Other Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID matching = seedClass(owner.id(), "Algebra 10 Filter Target", "Matching algebra class", Subject.MATH, 10, "ACTIVE", Instant.now());
        seedClass(owner.id(), "Algebra 11 Owner", "Wrong grade", Subject.MATH, 11, "ACTIVE", Instant.now().minusSeconds(5));
        seedClass(owner.id(), "Physics 10 Owner", "Wrong subject", Subject.PHYSICS, 10, "ACTIVE", Instant.now().minusSeconds(10));
        seedClass(otherOwner.id(), "Algebra 10 Other Owner", "Wrong owner", Subject.MATH, 10, "ACTIVE", Instant.now().plusSeconds(5));

        mockMvc.perform(get("/api/classes?subject=MATH&grade=10&status=ACTIVE&q=algebra&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(matching.toString()))
                .andExpect(jsonPath("$.items[0].name").value("Algebra 10 Filter Target"))
                .andExpect(jsonPath("$.items[0].memberCount").value(1))
                .andExpect(jsonPath("$.items[*].name", not(hasItem("Algebra 10 Other Owner"))));
    }

    @Test
    void IT_CC_003_ownerAndEnrolledStudentViewClassDetail() throws Exception {
        AppUser owner = user("owner-003@classroom-crud-it.edua.local", "Detail Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser enrolledStudent = user("student-003@classroom-crud-it.edua.local", "Enrolled Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        AppUser stranger = user("stranger-003@classroom-crud-it.edua.local", "Stranger Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Chemistry Detail Class", "Detail page class", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        seedMember(classId, enrolledStudent.id());

        mockMvc.perform(get("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Chemistry Detail Class"))
                .andExpect(jsonPath("$.ownerName").value("Detail Owner"))
                .andExpect(jsonPath("$.memberCount").value(2));

        mockMvc.perform(get("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(enrolledStudent, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Chemistry Detail Class"))
                .andExpect(jsonPath("$.memberCount").value(2));

        mockMvc.perform(get("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void IT_CC_004_ownerUpdatesClassInfo() throws Exception {
        AppUser owner = user("owner-004@classroom-crud-it.edua.local", "Update Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Physics Old Name", "Old description", Subject.PHYSICS, 10, "ACTIVE", Instant.now().minusSeconds(30));

        mockMvc.perform(patch("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Physics Updated Name",
                                  "subject": "PHYSICS",
                                  "grade": 12,
                                  "description": "Updated class description"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Physics Updated Name"))
                .andExpect(jsonPath("$.description").value("Updated class description"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.grade").value(12))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.ownerId").value(owner.id().toString()));

        Map<String, Object> updated = requireClass(classId);
        assertThat(updated.get("name")).isEqualTo("Physics Updated Name");
        assertThat(updated.get("description")).isEqualTo("Updated class description");
        assertThat(updated.get("grade")).isEqualTo(12);
        assertThat(updated.get("status")).isEqualTo("ACTIVE");
        assertThat(updated.get("owner_id")).isEqualTo(owner.id());

        mockMvc.perform(patch("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(requireClass(classId).get("name")).isEqualTo("Physics Updated Name");
    }

    @Test
    void IT_CC_005_ownerActivatesAndDeactivatesClass() throws Exception {
        AppUser owner = user("owner-005@classroom-crud-it.edua.local", "Status Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        UUID classId = seedClass(owner.id(), "Chemistry Status Class", "Status class", Subject.CHEMISTRY, 12, "ACTIVE", Instant.now());

        mockMvc.perform(patch("/api/classes/{id}/status", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        assertThat(requireClass(classId).get("status")).isEqualTo("INACTIVE");

        mockMvc.perform(get("/api/classes?status=INACTIVE&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].name", hasItem("Chemistry Status Class")));

        mockMvc.perform(patch("/api/classes/{id}/status", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        assertThat(requireClass(classId).get("status")).isEqualTo("ACTIVE");

        mockMvc.perform(patch("/api/classes/{id}/status", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isBadRequest());

        assertThat(requireClass(classId).get("status")).isEqualTo("ACTIVE");
    }

    @Test
    void IT_CC_006_deniesClassActionsForGuestWrongRoleAndStranger() throws Exception {
        AppUser owner = user("owner-006@classroom-crud-it.edua.local", "Owner Six", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-006@classroom-crud-it.edua.local", "Student Six", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-006@classroom-crud-it.edua.local", "Principal Six", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser strangerTeacher = user("teacher-006@classroom-crud-it.edua.local", "Stranger Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Protected Class", "Do not change", Subject.MATH, 10, "ACTIVE", Instant.now());
        String createPayload = """
                {
                  "name": "Denied Class",
                  "subject": "MATH",
                  "grade": 10,
                  "description": "Should not be created"
                }
                """;

        int beforeClasses = count("classes");

        mockMvc.perform(post("/api/classes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/classes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Wrong owner update\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/classes/{id}/status", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/classes/{id}", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER)))
                .andExpect(status().isForbidden());

        assertThat(count("classes")).isEqualTo(beforeClasses);
        Map<String, Object> unchanged = requireClass(classId);
        assertThat(unchanged.get("name")).isEqualTo("Protected Class");
        assertThat(unchanged.get("status")).isEqualTo("ACTIVE");
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_classroom_crud_it");
        jdbc.execute("SET search_path TO edua_classroom_crud_it");
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
        Instant createdAt = updatedAt.minusSeconds(60);
        jdbc.update("""
                INSERT INTO classes (id, owner_id, name, description, subject, grade, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                ownerId,
                name,
                description,
                subject.name(),
                grade,
                status,
                Timestamp.from(createdAt),
                Timestamp.from(updatedAt));
        return id;
    }

    private void seedMember(UUID classId, UUID studentId) {
        jdbc.update("""
                INSERT INTO class_members (id, class_id, student_id, joined_at)
                VALUES (?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                classId,
                studentId,
                Timestamp.from(Instant.now()));
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_classroom_crud_it");
        jdbc.update("DELETE FROM class_members");
        jdbc.update("DELETE FROM classes WHERE owner_id IN (SELECT id FROM app_users WHERE email LIKE ?)", TEST_EMAIL_PATTERN);
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

    private Map<String, Object> requireClass(UUID classId) {
        return jdbc.queryForMap("SELECT * FROM classes WHERE id = ?", classId);
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
