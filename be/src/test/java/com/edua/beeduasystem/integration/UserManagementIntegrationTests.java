package com.edua.beeduasystem.integration;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.TextbookCatalogImporter;
import com.edua.beeduasystem.repository.gateways.TokenService;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
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
class UserManagementIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@integration-test.edua.local";

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
        ensureUserManagementTables();
        deleteTestData();
        ensureRoles();
    }

    @AfterEach
    void cleanUpDatabase() {
        deleteTestData();
    }

    @Test
    void IT_UM_001_principalViewsModeratorList() throws Exception {
        AppUser principal = user("principal-001@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        user("math.mod.001@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);
        user("chem.mod.001@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.DISABLED, Role.MODERATOR, principal);

        mockMvc.perform(get("/api/principal/moderators?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("math.mod.001@integration-test.edua.local")))
                .andExpect(jsonPath("$.content[*].email", hasItem("chem.mod.001@integration-test.edua.local")))
                .andExpect(jsonPath("$.content[*].subject", hasItem("MATH")))
                .andExpect(jsonPath("$.content[*].status", hasItem("ACTIVE")))
                .andExpect(jsonPath("$.content[*].grantedByEmail", hasItem("principal-001@integration-test.edua.local")));
    }

    @Test
    void IT_UM_002_principalCreatesModerator() throws Exception {
        AppUser principal = user("principal-002@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);

        mockMvc.perform(post("/api/principal/moderators")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "New.Mod.002@INTEGRATION-TEST.EDUA.LOCAL",
                                  "fullName": "New Moderator",
                                  "subject": "MATH"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new.mod.002@integration-test.edua.local"))
                .andExpect(jsonPath("$.fullName").value("New Moderator"))
                .andExpect(jsonPath("$.subject").value("MATH"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        AppUser created = requireUser("new.mod.002@integration-test.edua.local");
        assertThat(created.subject()).isEqualTo(Subject.MATH);
        assertThat(created.status()).isEqualTo(UserStatus.INVITED);
        assertRoles(created, Role.MODERATOR);
        assertActivityCount("GRANT_MODERATOR", 1);
    }

    @Test
    void IT_UM_003_principalCannotCreateSecondActiveModeratorForSameSubject() throws Exception {
        AppUser principal = user("principal-003@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        user("existing.mod.003@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);

        mockMvc.perform(post("/api/principal/moderators")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "another.mod.003@integration-test.edua.local",
                                  "fullName": "Another Moderator",
                                  "subject": "MATH"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("Mỗi môn chỉ được phép 1 moderator")));

        assertThat(userRepository.findByEmail("another.mod.003@integration-test.edua.local")).isEmpty();
        assertActivityCount("GRANT_MODERATOR", 0);
    }

    @Test
    void IT_UM_004_principalCannotCreateModeratorWithDuplicateActiveEmail() throws Exception {
        AppUser principal = user("principal-004@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser existing = user("duplicate.004@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, principal);

        mockMvc.perform(post("/api/principal/moderators")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "duplicate.004@integration-test.edua.local",
                                  "fullName": "Duplicate",
                                  "subject": "PHYSICS"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("đã tồn tại")));

        assertRoles(existing, Role.TEACHER);
        assertThat(requireUser("duplicate.004@integration-test.edua.local").subject()).isEqualTo(Subject.CHEMISTRY);
    }

    @Test
    void IT_UM_005_principalReplacesModerator() throws Exception {
        AppUser principal = user("principal-005@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser oldModerator = user("old.mod.005@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser replacement = user("replacement.005@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, principal);

        mockMvc.perform(post("/api/principal/moderators/{id}/replacement", oldModerator.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "replacementEmail": "replacement.005@integration-test.edua.local",
                                  "disablePrevious": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("replacement.005@integration-test.edua.local"))
                .andExpect(jsonPath("$.subject").value("MATH"));

        assertRoles(requireUser("old.mod.005@integration-test.edua.local"), Role.TEACHER);
        assertThat(requireUser("old.mod.005@integration-test.edua.local").status()).isEqualTo(UserStatus.DISABLED);
        assertRoles(requireUser("replacement.005@integration-test.edua.local"), Role.MODERATOR);
        assertActivityCount("REPLACE_MODERATOR", 1);
    }

    @Test
    void IT_UM_006_principalRejectsInvalidModeratorReplacementData() throws Exception {
        AppUser principal = user("principal-006@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser oldModerator = user("old.mod.006@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR, principal);
        user("other.subject.006@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, principal);

        mockMvc.perform(post("/api/principal/moderators/{id}/replacement", oldModerator.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "replacementEmail": "old.mod.006@integration-test.edua.local",
                                  "disablePrevious": false
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("phải khác")));

        mockMvc.perform(post("/api/principal/moderators/{id}/replacement", oldModerator.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "replacementEmail": "other.subject.006@integration-test.edua.local",
                                  "disablePrevious": false
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("cùng môn")));

        assertRoles(requireUser("old.mod.006@integration-test.edua.local"), Role.MODERATOR);
        assertThat(requireUser("old.mod.006@integration-test.edua.local").status()).isEqualTo(UserStatus.ACTIVE);
        assertActivityCount("REPLACE_MODERATOR", 0);
    }

    @Test
    void IT_UM_007_principalReactivatesDisabledModerator() throws Exception {
        AppUser principal = user("principal-007@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser disabled = user("disabled.mod.007@integration-test.edua.local", Subject.PHYSICS, UserStatus.DISABLED, Role.MODERATOR, principal);

        mockMvc.perform(patch("/api/principal/moderators/{id}/reactivate", disabled.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("disabled.mod.007@integration-test.edua.local"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        AppUser reactivated = requireUser("disabled.mod.007@integration-test.edua.local");
        assertThat(reactivated.status()).isEqualTo(UserStatus.INVITED);
        assertRoles(reactivated, Role.MODERATOR);
        assertActivityCount("REACTIVATE_MODERATOR", 1);
    }

    @Test
    void IT_UM_008_principalViewsItStaffList() throws Exception {
        AppUser principal = user("principal-008@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        user("it.active.008@integration-test.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);
        user("it.disabled.008@integration-test.edua.local", null, UserStatus.DISABLED, Role.IT_STAFF, principal);

        mockMvc.perform(get("/api/principal/it-staff?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("it.active.008@integration-test.edua.local")))
                .andExpect(jsonPath("$.content[*].email", hasItem("it.disabled.008@integration-test.edua.local")))
                .andExpect(jsonPath("$.content[*].status", hasItem("ACTIVE")))
                .andExpect(jsonPath("$.content[*].status", hasItem("DISABLED")));
    }

    @Test
    void IT_UM_009_principalCreatesItStaff() throws Exception {
        AppUser principal = user("principal-009@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);

        mockMvc.perform(post("/api/principal/it-staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "IT.Staff.009@INTEGRATION-TEST.EDUA.LOCAL",
                                  "fullName": "IT Staff"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("it.staff.009@integration-test.edua.local"))
                .andExpect(jsonPath("$.fullName").value("IT Staff"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        AppUser created = requireUser("it.staff.009@integration-test.edua.local");
        assertThat(created.subject()).isNull();
        assertRoles(created, Role.IT_STAFF);
        assertActivityCount("GRANT_IT_STAFF", 1);
    }

    @Test
    void IT_UM_010_principalCannotCreateItStaffWithDuplicateActiveEmail() throws Exception {
        AppUser principal = user("principal-010@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser existing = user("duplicate.010@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, principal);

        mockMvc.perform(post("/api/principal/it-staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "duplicate.010@integration-test.edua.local",
                                  "fullName": "Duplicate IT"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("đã tồn tại")));

        assertRoles(existing, Role.TEACHER);
    }

    @Test
    void IT_UM_011_principalRevokesItStaff() throws Exception {
        AppUser principal = user("principal-011@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser itStaff = user("it.revoke.011@integration-test.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);

        mockMvc.perform(delete("/api/principal/it-staff/{id}", itStaff.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isNoContent());

        assertThat(requireUser("it.revoke.011@integration-test.edua.local").status()).isEqualTo(UserStatus.DISABLED);
        assertRoles(itStaff, Role.IT_STAFF);
        assertActivityCount("REVOKE_IT_STAFF", 1);
    }

    @Test
    void IT_UM_012_principalReactivatesItStaff() throws Exception {
        AppUser principal = user("principal-012@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser itStaff = user("it.reactivate.012@integration-test.edua.local", null, UserStatus.DISABLED, Role.IT_STAFF, principal);

        mockMvc.perform(patch("/api/principal/it-staff/{id}/reactivate", itStaff.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("it.reactivate.012@integration-test.edua.local"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        assertThat(requireUser("it.reactivate.012@integration-test.edua.local").status()).isEqualTo(UserStatus.INVITED);
        assertRoles(itStaff, Role.IT_STAFF);
        assertActivityCount("REACTIVATE_IT_STAFF", 1);
    }

    @Test
    void IT_UM_013_moderatorViewsTeachersInSameSubjectOnly() throws Exception {
        AppUser principal = user("principal-013@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("chem.mod.013@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR, principal);
        user("chem.teacher.013@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, moderator);
        user("math.teacher.013@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, principal);

        mockMvc.perform(get("/api/moderator/teachers?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].email", hasItem("chem.teacher.013@integration-test.edua.local")))
                .andExpect(jsonPath("$.content[*].email", not(hasItem("math.teacher.013@integration-test.edua.local"))))
                .andExpect(jsonPath("$.content[*].subject", everyItem(org.hamcrest.Matchers.equalTo("CHEMISTRY"))));
    }

    @Test
    void IT_UM_014_moderatorCreatesTeacherInOwnSubject() throws Exception {
        AppUser principal = user("principal-014@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("physics.mod.014@integration-test.edua.local", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR, principal);

        mockMvc.perform(post("/api/moderator/teachers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "New.Teacher.014@INTEGRATION-TEST.EDUA.LOCAL",
                                  "fullName": "New Teacher",
                                  "subject": "PHYSICS"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("new.teacher.014@integration-test.edua.local"))
                .andExpect(jsonPath("$.fullName").value("New Teacher"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        AppUser created = requireUser("new.teacher.014@integration-test.edua.local");
        assertThat(created.subject()).isEqualTo(Subject.PHYSICS);
        assertRoles(created, Role.TEACHER);
        assertActivityCount("GRANT_TEACHER", 1);
    }

    @Test
    void IT_UM_015_moderatorCannotCreateTeacherWithDuplicateActiveEmail() throws Exception {
        AppUser principal = user("principal-015@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("math.mod.015@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser existing = user("duplicate.015@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER, moderator);

        mockMvc.perform(post("/api/moderator/teachers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "duplicate.015@integration-test.edua.local",
                                  "fullName": "Duplicate Teacher",
                                  "subject": "MATH"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("đã tồn tại")));

        assertRoles(existing, Role.TEACHER);
    }

    @Test
    void IT_UM_016_moderatorRevokesTeacherInSameSubject() throws Exception {
        AppUser principal = user("principal-016@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("chem.mod.016@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser teacher = user("chem.teacher.016@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, moderator);

        mockMvc.perform(delete("/api/moderator/teachers/{id}", teacher.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isNoContent());

        assertThat(requireUser("chem.teacher.016@integration-test.edua.local").status()).isEqualTo(UserStatus.DISABLED);
        assertRoles(teacher, Role.TEACHER);
        assertActivityCount("REVOKE_TEACHER", 1);
    }

    @Test
    void IT_UM_017_moderatorReactivatesTeacherInSameSubject() throws Exception {
        AppUser principal = user("principal-017@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("math.mod.017@integration-test.edua.local", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser teacher = user("math.teacher.017@integration-test.edua.local", Subject.MATH, UserStatus.DISABLED, Role.TEACHER, moderator);

        mockMvc.perform(patch("/api/moderator/teachers/{id}/reactivate", teacher.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("math.teacher.017@integration-test.edua.local"))
                .andExpect(jsonPath("$.status").value("INVITED"));

        assertThat(requireUser("math.teacher.017@integration-test.edua.local").status()).isEqualTo(UserStatus.INVITED);
        assertRoles(teacher, Role.TEACHER);
        assertActivityCount("REACTIVATE_TEACHER", 1);
    }

    @Test
    void IT_UM_018_userManagementApisDenyUnauthorizedRoles() throws Exception {
        AppUser principal = user("principal-018@integration-test.edua.local", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser moderator = user("mod-018@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR, principal);
        AppUser teacher = user("teacher-018@integration-test.edua.local", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER, moderator);
        AppUser itStaff = user("it-018@integration-test.edua.local", null, UserStatus.ACTIVE, Role.IT_STAFF, principal);
        AppUser student = user("student-018@integration-test.edua.local", null, UserStatus.ACTIVE, Role.STUDENT, principal);

        mockMvc.perform(get("/api/principal/moderators")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/principal/it-staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/moderator/teachers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/moderator/teachers")
                        .header(HttpHeaders.AUTHORIZATION, bearer(itStaff, Role.IT_STAFF)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/principal/it-staff")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isForbidden());
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

    private void ensureUserManagementTables() {
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
                    actor_id UUID NOT NULL REFERENCES app_users (id),
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

    private void deleteTestData() {
        jdbc.update("""
                DELETE FROM activity_logs
                WHERE actor_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                   OR target_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                """, TEST_EMAIL_PATTERN, TEST_EMAIL_PATTERN);
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

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }

    private AppUser requireUser(String email) {
        return userRepository.findByEmail(email).orElseThrow();
    }

    private void assertRoles(AppUser user, Role role) {
        assertThat(userRoleRepository.findRolesByUserId(user.id())).containsExactly(role);
    }

    private void assertActivityCount(String action, int expectedCount) {
        Integer count = jdbc.queryForObject(
                """
                        SELECT COUNT(*)
                        FROM activity_logs
                        WHERE action = ?
                          AND (
                              actor_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                              OR target_id IN (SELECT id FROM app_users WHERE email LIKE ?)
                          )
                        """,
                Integer.class,
                action,
                TEST_EMAIL_PATTERN,
                TEST_EMAIL_PATTERN);
        assertThat(count).isEqualTo(expectedCount);
    }
}

