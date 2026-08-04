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
import org.springframework.mock.web.MockMultipartFile;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.show-sql=false",
        // Test nay tu tao schema/bang rieng trong ensureTables(), nen Flyway khong duoc chay tren schema do.
        "spring.flyway.enabled=false",
        "spring.datasource.url=${IT_DB_URL:${DB_URL}}",
        "spring.datasource.username=${IT_DB_USERNAME:${DB_USERNAME}}",
        "spring.datasource.password=${IT_DB_PASSWORD:${DB_PASSWORD}}",
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_classroom_membership_it",
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
class ClassroomMembershipIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@classroom-membership-it.edua.local";

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
    void IT_CM_001_ownerAddsStudentByGmail() throws Exception {
        AppUser owner = user("owner-001@classroom-membership-it.edua.local", "Membership Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Algebra Membership Class", "Add student target", Subject.MATH, 10, "ACTIVE", Instant.now());
        int beforeUsers = count("app_users");
        int beforeMembers = count("class_members");

        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"New Student One\",\"phoneNumber\":\"0901000001\",\"dateOfBirth\":\"2010-01-01\",\"email\":\"  NEW-STUDENT-001@CLASSROOM-MEMBERSHIP-IT.EDUA.LOCAL  \"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentEmail").value("new-student-001@classroom-membership-it.edua.local"))
                .andExpect(jsonPath("$.studentStatus").value("INVITED"));

        assertThat(count("app_users")).isEqualTo(beforeUsers + 1);
        assertThat(count("class_members")).isEqualTo(beforeMembers + 1);
        AppUser student = requireUser("new-student-001@classroom-membership-it.edua.local");
        assertThat(hasRole(student.id(), "STUDENT")).isTrue();
        assertThat(isEnrolled(classId, student.id())).isTrue();
        assertEnrollmentNotification(owner.id(), student.id(), "Ban da duoc them vao lop Algebra Membership Class");
        verify(notificationStreamPort).publishNew(eq(student.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_CM_002_ownerImportsStudentsFromCsvWithSkippedRows() throws Exception {
        AppUser owner = user("owner-002@classroom-membership-it.edua.local", "Import Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser existingStudent = user("existing-002@classroom-membership-it.edua.local", "Existing Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        user("role-conflict-002@classroom-membership-it.edua.local", "Teacher Conflict", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Chemistry Import Class", "Import target", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        MockMultipartFile csv = new MockMultipartFile(
                "file",
                "students.csv",
                "text/csv",
                """
                        gmail
                        Imported-002@CLASSROOM-MEMBERSHIP-IT.EDUA.LOCAL
                        invalid-email
                        imported-002@classroom-membership-it.edua.local
                        role-conflict-002@classroom-membership-it.edua.local
                        existing-002@classroom-membership-it.edua.local
                        """.getBytes());

        mockMvc.perform(multipart("/api/classes/{id}/members/import", classId)
                        .file(csv)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addedCount").value(2))
                .andExpect(jsonPath("$.skippedCount").value(3))
                .andExpect(jsonPath("$.skipped[*].reason", hasItem("INVALID_FORMAT")))
                .andExpect(jsonPath("$.skipped[*].reason", hasItem("DUPLICATE_IN_FILE")))
                .andExpect(jsonPath("$.skipped[*].reason", hasItem("ROLE_CONFLICT")));

        AppUser imported = requireUser("imported-002@classroom-membership-it.edua.local");
        assertThat(isEnrolled(classId, imported.id())).isTrue();
        assertThat(isEnrolled(classId, existingStudent.id())).isTrue();
        assertThat(isEnrolled(classId, requireUser("role-conflict-002@classroom-membership-it.edua.local").id())).isFalse();
        assertThat(memberCount(classId)).isEqualTo(2);
        assertRecipientIds(requireSingleNotificationId("Ban da duoc them vao lop Chemistry Import Class"),
                List.of(imported.id(), existingStudent.id()));
        verify(notificationStreamPort).publishNew(eq(imported.id()), any(NotificationEvent.class));
        verify(notificationStreamPort).publishNew(eq(existingStudent.id()), any(NotificationEvent.class));
        verify(notificationStreamPort, times(2)).publishNew(any(UUID.class), any(NotificationEvent.class));
    }

    @Test
    void IT_CM_003_ownerAndEnrolledStudentListClassMembers() throws Exception {
        AppUser owner = user("owner-003@classroom-membership-it.edua.local", "Roster Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser studentOne = user("student1-003@classroom-membership-it.edua.local", "Student One", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        AppUser studentTwo = user("student2-003@classroom-membership-it.edua.local", "Student Two", Subject.PHYSICS, UserStatus.INVITED, Role.STUDENT);
        AppUser stranger = user("stranger-003@classroom-membership-it.edua.local", "Stranger", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Physics Roster Class", "Roster target", Subject.PHYSICS, 12, "ACTIVE", Instant.now());
        seedMember(classId, studentOne.id(), Instant.now().minusSeconds(20));
        seedMember(classId, studentTwo.id(), Instant.now());

        mockMvc.perform(get("/api/classes/{id}/members?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("student1-003@classroom-membership-it.edua.local")))
                .andExpect(jsonPath("$.items[*].studentEmail", hasItem("student2-003@classroom-membership-it.edua.local")))
                .andExpect(jsonPath("$.items[*].studentStatus", hasItem("INVITED")));

        mockMvc.perform(get("/api/classes/{id}/members?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(studentOne, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2));

        mockMvc.perform(get("/api/classes/{id}/members?page=0&size=20", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(stranger, Role.STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void IT_CM_004_studentListsOnlyEnrolledClasses() throws Exception {
        AppUser owner = user("owner-004@classroom-membership-it.edua.local", "Class Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherOwner = user("other-owner-004@classroom-membership-it.edua.local", "Other Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-004@classroom-membership-it.edua.local", "Student Four", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        UUID activeClass = seedClass(owner.id(), "Math Enrolled Active", "Student target", Subject.MATH, 10, "ACTIVE", Instant.now());
        UUID inactiveClass = seedClass(owner.id(), "Math Enrolled Inactive", "Inactive target", Subject.MATH, 10, "INACTIVE", Instant.now().minusSeconds(5));
        seedClass(otherOwner.id(), "Math Not Enrolled", "Hidden", Subject.MATH, 10, "ACTIVE", Instant.now().plusSeconds(5));
        seedMember(activeClass, student.id(), Instant.now());
        seedMember(inactiveClass, student.id(), Instant.now().minusSeconds(10));

        mockMvc.perform(get("/api/classes/enrolled?subject=MATH&grade=10&status=ACTIVE&q=enrolled&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(activeClass.toString()))
                .andExpect(jsonPath("$.items[*].name", hasItem("Math Enrolled Active")))
                .andExpect(jsonPath("$.items[*].name", not(hasItem("Math Enrolled Inactive"))))
                .andExpect(jsonPath("$.items[*].name", not(hasItem("Math Not Enrolled"))));
    }

    @Test
    void IT_CM_005_preventsDuplicateEnrollment() throws Exception {
        AppUser owner = user("owner-005@classroom-membership-it.edua.local", "Duplicate Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-005@classroom-membership-it.edua.local", "Duplicate Student", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Duplicate Class", "Duplicate target", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        seedMember(classId, student.id(), Instant.now());
        int beforeMembers = count("class_members");

        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Duplicate Student\",\"phoneNumber\":\"0901000005\",\"dateOfBirth\":\"2010-01-05\",\"email\":\"student-005@classroom-membership-it.edua.local\"}"))
                .andExpect(status().isConflict());

        MockMultipartFile csv = new MockMultipartFile(
                "file",
                "duplicates.csv",
                "text/csv",
                """
                        gmail
                        student-005@classroom-membership-it.edua.local
                        """.getBytes());
        mockMvc.perform(multipart("/api/classes/{id}/members/import", classId)
                        .file(csv)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.addedCount").value(0))
                .andExpect(jsonPath("$.skippedCount").value(1))
                .andExpect(jsonPath("$.skipped[0].reason").value("ALREADY_ENROLLED"));

        assertThat(count("class_members")).isEqualTo(beforeMembers);
        assertThat(memberCount(classId)).isEqualTo(1);
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_006_deniesMembershipActionsForGuestWrongRoleStrangerAndInactiveClass() throws Exception {
        AppUser owner = user("owner-006@classroom-membership-it.edua.local", "Permission Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-006@classroom-membership-it.edua.local", "Student Six", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-006@classroom-membership-it.edua.local", "Principal Six", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser strangerTeacher = user("teacher-006@classroom-membership-it.edua.local", "Stranger Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID classId = seedClass(owner.id(), "Protected Membership Class", "Protected", Subject.PHYSICS, 12, "ACTIVE", Instant.now());
        UUID inactiveClassId = seedClass(owner.id(), "Inactive Membership Class", "Inactive", Subject.PHYSICS, 12, "INACTIVE", Instant.now());
        String payload = "{\"fullName\":\"Denied Student\",\"phoneNumber\":\"0901000006\",\"dateOfBirth\":\"2010-01-06\",\"email\":\"denied-006@classroom-membership-it.edua.local\"}";
        int beforeMembers = count("class_members");
        int beforeUsers = count("app_users");

        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/classes/{id}/members", inactiveClassId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());

        assertThat(count("class_members")).isEqualTo(beforeMembers);
        assertThat(count("app_users")).isEqualTo(beforeUsers);
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_007_hardDeletesInvitedStudentAndFreesSlot() throws Exception {
        AppUser owner = user("owner-007@classroom-membership-it.edua.local", "Hard Delete Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser invited = user("invited-007@classroom-membership-it.edua.local", "Invited Seven", Subject.MATH, UserStatus.INVITED, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Hard Delete Class", "Remove target", Subject.MATH, 10, "ACTIVE", Instant.now());
        UUID otherClassId = seedClass(owner.id(), "Other Hard Delete Class", "Other target", Subject.MATH, 10, "ACTIVE", Instant.now());
        seedMember(classId, invited.id(), Instant.now());
        seedMember(otherClassId, invited.id(), Instant.now().minusSeconds(5));
        seedRecipient(invited.id());
        int beforeUsers = count("app_users");
        int beforeRoles = count("user_roles");

        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, invited.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("HARD_DELETE"))
                .andExpect(jsonPath("$.notified").value(false));

        // INVITED chưa từng đăng nhập → hard-delete: xóa hết membership (mọi lớp), role, recipient, tài khoản.
        assertThat(userRepository.findByEmail("invited-007@classroom-membership-it.edua.local")).isEmpty();
        assertThat(count("app_users")).isEqualTo(beforeUsers - 1);
        assertThat(count("user_roles")).isEqualTo(beforeRoles - 1);
        assertThat(memberCount(classId)).isZero();
        assertThat(memberCount(otherClassId)).isZero();
        assertThat(recipientCount(invited.id())).isZero();
        assertThat(hasRole(invited.id(), "STUDENT")).isFalse();
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_008_softRemovesActiveStudentKeepsDataAndNotifiesWithReason() throws Exception {
        AppUser owner = user("owner-008@classroom-membership-it.edua.local", "Soft Remove Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser activeStudent = user("active-008@classroom-membership-it.edua.local", "Active Eight", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Soft Remove Class", "Remove target", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        seedMember(classId, activeStudent.id(), Instant.now());
        int beforeUsers = count("app_users");

        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, activeStudent.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Qua so luong hoc sinh, lop can gan gon.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("SOFT_REMOVE"))
                .andExpect(jsonPath("$.notified").value(true));

        // Soft-remove: chỉ gỡ khỏi lớp này, giữ nguyên tài khoản + dữ liệu; slot 60 được giải phóng.
        assertThat(memberCount(classId)).isZero();
        assertThat(count("app_users")).isEqualTo(beforeUsers);
        assertThat(userRepository.findByEmail("active-008@classroom-membership-it.edua.local")).isPresent();
        assertThat(hasRole(activeStudent.id(), "STUDENT")).isTrue();
        Map<String, Object> removalNotification = jdbc.queryForMap(
                "SELECT * FROM notifications WHERE title = 'Ban da bi xoa khoi lop Soft Remove Class'");
        assertThat(removalNotification.get("content").toString()).contains("Qua so luong hoc sinh");
        assertRecipientIds((UUID) removalNotification.get("id"), List.of(activeStudent.id()));
        verify(notificationStreamPort).publishNew(eq(activeStudent.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_CM_009_requiresReasonWhenRemovingActiveStudent() throws Exception {
        AppUser owner = user("owner-009@classroom-membership-it.edua.local", "Reason Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser activeStudent = user("active-009@classroom-membership-it.edua.local", "Active Nine", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Reason Class", "Remove target", Subject.PHYSICS, 12, "ACTIVE", Instant.now());
        seedMember(classId, activeStudent.id(), Instant.now());

        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, activeStudent.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());

        assertThat(memberCount(classId)).isEqualTo(1);
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_010_softRemovesDisabledStudentWithoutNotification() throws Exception {
        AppUser owner = user("owner-010@classroom-membership-it.edua.local", "Disabled Owner", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser disabled = user("disabled-010@classroom-membership-it.edua.local", "Disabled Ten", Subject.MATH, UserStatus.DISABLED, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Disabled Class", "Remove target", Subject.MATH, 10, "ACTIVE", Instant.now());
        seedMember(classId, disabled.id(), Instant.now());

        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, disabled.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Tai khoan da khoa.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("SOFT_REMOVE"))
                .andExpect(jsonPath("$.notified").value(false));

        assertThat(memberCount(classId)).isZero();
        assertThat(userRepository.findByEmail("disabled-010@classroom-membership-it.edua.local")).isPresent();
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_011_rejectsRemovalOfNonMemberAndStranger() throws Exception {
        AppUser owner = user("owner-011@classroom-membership-it.edua.local", "Permission Remove Owner", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser strangerTeacher = user("teacher-011@classroom-membership-it.edua.local", "Stranger Remove Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser outsider = user("outsider-011@classroom-membership-it.edua.local", "Outsider Eleven", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Protected Remove Class", "Protected", Subject.CHEMISTRY, 11, "ACTIVE", Instant.now());
        UUID otherClassMemberId = UUID.randomUUID();
        seedMember(classId, otherClassMemberId, Instant.now());

        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, outsider.id())
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"khong co\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/classes/{id}/members/{studentId}", classId, otherClassMemberId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(strangerTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"khong co\"}"))
                .andExpect(status().isForbidden());
        assertThat(memberCount(classId)).isEqualTo(1);
        verifyNoInteractions(notificationStreamPort);
    }

    @Test
    void IT_CM_012_profileMismatchReturnsExistingAccountThenReuseAddsIt() throws Exception {
        AppUser owner = user("owner-012@classroom-membership-it.edua.local", "Reuse Owner", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser existing = user("reuse-012@classroom-membership-it.edua.local", "Original Name", Subject.PHYSICS, UserStatus.ACTIVE, Role.STUDENT);
        UUID classId = seedClass(owner.id(), "Reuse Class", "Reuse target", Subject.PHYSICS, 12, "ACTIVE", Instant.now());

        // Nhập sai hồ sơ so với tài khoản cũ → 409 PROFILE_MISMATCH kèm thông tin tài khoản cũ.
        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Different Name\",\"phoneNumber\":\"0901000123\",\"dateOfBirth\":\"2009-02-02\",\"email\":\"reuse-012@classroom-membership-it.edua.local\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.reason").value("PROFILE_MISMATCH"))
                .andExpect(jsonPath("$.existingAccount.email").value("reuse-012@classroom-membership-it.edua.local"))
                .andExpect(jsonPath("$.existingAccount.fullName").value("Original Name"));

        assertThat(memberCount(classId)).isZero();

        // Giáo viên xác nhận "gán lại account cũ" → reuseExistingAccount=true → thêm được dù hồ sơ không khớp.
        mockMvc.perform(post("/api/classes/{id}/members", classId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(owner, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Different Name\",\"phoneNumber\":\"0901000123\",\"dateOfBirth\":\"2009-02-02\",\"email\":\"reuse-012@classroom-membership-it.edua.local\",\"reuseExistingAccount\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.studentId").value(existing.id().toString()));

        assertThat(memberCount(classId)).isEqualTo(1);
        assertThat(isEnrolled(classId, existing.id())).isTrue();
        assertThat(count("app_users")).isEqualTo(2);
        verify(notificationStreamPort).publishNew(eq(existing.id()), any(NotificationEvent.class));
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_classroom_membership_it");
        jdbc.execute("SET search_path TO edua_classroom_membership_it");
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS app_users (
                    id UUID PRIMARY KEY,
                    email VARCHAR(320) NOT NULL UNIQUE,
                    google_sub VARCHAR(255) UNIQUE,
                    full_name VARCHAR(255),
                    avatar_url VARCHAR(1000),
                    contact_info VARCHAR(1000),
                    bio VARCHAR(1000),
                    phone_number VARCHAR(30),
                    date_of_birth DATE,
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

    private void seedMember(UUID classId, UUID studentId, Instant joinedAt) {
        jdbc.update("""
                INSERT INTO class_members (id, class_id, student_id, joined_at)
                VALUES (?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                classId,
                studentId,
                Timestamp.from(joinedAt));
    }

    private void seedRecipient(UUID studentId) {
        UUID notificationId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO notifications (id, sender_id, subject, title, content, created_at)
                VALUES (?, ?, 'MATH', 'Enrollment', 'content', ?)
                """, notificationId, UUID.randomUUID(), Timestamp.from(Instant.now()));
        jdbc.update("""
                INSERT INTO notification_recipients (id, notification_id, recipient_id, created_at)
                VALUES (?, ?, ?, ?)
                """, UUID.randomUUID(), notificationId, studentId, Timestamp.from(Instant.now()));
    }

    private long recipientCount(UUID studentId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM notification_recipients WHERE recipient_id = ?",
                Long.class,
                studentId);
        return count == null ? 0 : count;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_classroom_membership_it");
        jdbc.update("DELETE FROM notification_recipients");
        jdbc.update("DELETE FROM notifications");
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

    private long memberCount(UUID classId) {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM class_members WHERE class_id = ?", Long.class, classId);
        return count == null ? 0 : count;
    }

    private boolean isEnrolled(UUID classId, UUID studentId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM class_members WHERE class_id = ? AND student_id = ?",
                Integer.class,
                classId,
                studentId);
        return count != null && count > 0;
    }

    private boolean hasRole(UUID userId, String roleName) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = ? AND r.name = ?
                """, Integer.class, userId, roleName);
        return count != null && count > 0;
    }

    private AppUser requireUser(String email) {
        return userRepository.findByEmail(email).orElseThrow();
    }

    private UUID requireSingleNotificationId(String title) {
        return jdbc.queryForObject("SELECT id FROM notifications WHERE title = ?", UUID.class, title);
    }

    private void assertEnrollmentNotification(UUID senderId, UUID recipientId, String title) {
        UUID notificationId = requireSingleNotificationId(title);
        Map<String, Object> notification = jdbc.queryForMap("SELECT * FROM notifications WHERE id = ?", notificationId);
        assertThat(notification.get("sender_id")).isEqualTo(senderId);
        assertRecipientIds(notificationId, List.of(recipientId));
    }

    private void assertRecipientIds(UUID notificationId, List<UUID> expectedRecipientIds) {
        List<UUID> actual = jdbc.queryForList(
                "SELECT recipient_id FROM notification_recipients WHERE notification_id = ?",
                UUID.class,
                notificationId);
        assertThat(actual).containsExactlyInAnyOrderElementsOf(expectedRecipientIds);
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
