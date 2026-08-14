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
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_weekly_task_it",
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
class WeeklyTaskIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@weekly-task-it.edua.local";

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
    void IT_WT_001_teacherAndModeratorViewWeeklyScheduleInTheirScope() throws Exception {
        AppUser moderator = user("moderator-001@weekly-task-it.edua.local", "Math Moderator", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacherOne = user("teacher1-001@weekly-task-it.edua.local", "Math Teacher One", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser teacherTwo = user("teacher2-001@weekly-task-it.edua.local", "Math Teacher Two", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser chemistryModerator = user("chem.mod-001@weekly-task-it.edua.local", "Chemistry Moderator", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser chemistryTeacher = user("chem.teacher-001@weekly-task-it.edua.local", "Chemistry Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        LocalDate week = LocalDate.now().plusWeeks(1);
        seedTask(moderator.id(), Subject.MATH, teacherOne.id(), week, "Math owner schedule", Instant.now().plusSeconds(86_400), "NOT_SUBMITTED");
        seedTask(moderator.id(), Subject.MATH, teacherTwo.id(), week, "Math subject schedule", Instant.now().plusSeconds(172_800), "SUBMITTED");
        seedTask(chemistryModerator.id(), Subject.CHEMISTRY, chemistryTeacher.id(), week, "Chemistry schedule", Instant.now().plusSeconds(172_800), "SUBMITTED");

        mockMvc.perform(get("/api/weekly-tasks?from={from}&to={to}", week.minusDays(1), week.plusDays(1))
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacherOne, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", hasItem("Math owner schedule")))
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", not(hasItem("Math subject schedule"))))
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", not(hasItem("Chemistry schedule"))));

        mockMvc.perform(get("/api/weekly-tasks?from={from}&to={to}", week.minusDays(1), week.plusDays(1))
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", hasItem("Math owner schedule")))
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", hasItem("Math subject schedule")))
                .andExpect(jsonPath("$.weeks[0].tasks[*].scopeDescription", not(hasItem("Chemistry schedule"))));
    }

    @Test
    void IT_WT_002_moderatorCreatesWeeklyTaskForSameSubjectTeacher() throws Exception {
        AppUser moderator = user("moderator-002@weekly-task-it.edua.local", "Physics Moderator", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-002@weekly-task-it.edua.local", "Physics Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        int beforeTasks = count("weekly_tasks");
        int beforeNotifications = count("notifications");
        Instant deadline = Instant.now().plusSeconds(86_400);

        mockMvc.perform(post("/api/weekly-tasks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "teacherId": "%s",
                                  "weekStartDate": "%s",
                                  "scopeDescription": "  Prepare Newton laws lesson  ",
                                  "deadline": "%s"
                                }
                                """.formatted(teacher.id(), LocalDate.now().plusWeeks(1), deadline)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teacherId").value(teacher.id().toString()))
                .andExpect(jsonPath("$.teacherName").value("Physics Teacher"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.scopeDescription").value("Prepare Newton laws lesson"))
                .andExpect(jsonPath("$.reviewStatus").value("NOT_SUBMITTED"));

        assertThat(count("weekly_tasks")).isEqualTo(beforeTasks + 1);
        assertThat(count("notifications")).isEqualTo(beforeNotifications + 1);
        Map<String, Object> task = requireTaskByScope("Prepare Newton laws lesson");
        assertThat(task.get("moderator_id")).isEqualTo(moderator.id());
        assertThat(task.get("teacher_id")).isEqualTo(teacher.id());
        assertThat(task.get("review_status")).isEqualTo("NOT_SUBMITTED");
        assertThat(hasNotificationRecipient(teacher.id())).isTrue();
        verify(notificationStreamPort).publishNew(eq(teacher.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_WT_003_moderatorBulkCreatesWeeklyTasksForActiveSameSubjectTeachers() throws Exception {
        AppUser moderator = user("moderator-003@weekly-task-it.edua.local", "Chemistry Moderator", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacherOne = user("teacher1-003@weekly-task-it.edua.local", "Chemistry Teacher One", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser teacherTwo = user("teacher2-003@weekly-task-it.edua.local", "Chemistry Teacher Two", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser disabledTeacher = user("disabled-003@weekly-task-it.edua.local", "Disabled Chemistry Teacher", Subject.CHEMISTRY, UserStatus.DISABLED, Role.TEACHER);
        user("math.teacher-003@weekly-task-it.edua.local", "Math Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        LocalDate week = LocalDate.now().plusWeeks(2);
        Instant firstDeadline = Instant.now().plusSeconds(86_400);
        Instant secondDeadline = Instant.now().plusSeconds(172_800);

        mockMvc.perform(post("/api/weekly-tasks/bulk")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "weekStartDate": "%s",
                                  "lessons": [
                                    { "scopeDescription": "Chemical bonds", "deadline": "%s" },
                                    { "scopeDescription": "Oxidation lesson", "deadline": "%s" }
                                  ]
                                }
                                """.formatted(week, firstDeadline, secondDeadline)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.teacherCount").value(2))
                .andExpect(jsonPath("$.lessonCount").value(2))
                .andExpect(jsonPath("$.created", hasSize(4)))
                .andExpect(jsonPath("$.created[*].teacherId", hasItem(teacherOne.id().toString())))
                .andExpect(jsonPath("$.created[*].teacherId", hasItem(teacherTwo.id().toString())))
                .andExpect(jsonPath("$.created[*].teacherId", not(hasItem(disabledTeacher.id().toString()))));

        assertThat(countTasksForSubjectAndWeek("CHEMISTRY", week)).isEqualTo(4);
        assertThat(countTasksForTeacher(disabledTeacher.id())).isZero();
        verify(notificationStreamPort, times(2)).publishNew(any(UUID.class), any(NotificationEvent.class));

        mockMvc.perform(post("/api/weekly-tasks/bulk")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "weekStartDate": "%s",
                                  "lessons": [{ "scopeDescription": "Duplicate", "deadline": "%s" }]
                                }
                                """.formatted(week, Instant.now().plusSeconds(259_200))))
                .andExpect(status().isBadRequest());

        assertThat(countTasksForSubjectAndWeek("CHEMISTRY", week)).isEqualTo(4);
    }

    @Test
    void IT_WT_004_moderatorUpdatesWeeklyTaskAndReassignsTeacher() throws Exception {
        AppUser moderator = user("moderator-004@weekly-task-it.edua.local", "Math Moderator Four", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser oldTeacher = user("old.teacher-004@weekly-task-it.edua.local", "Old Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser newTeacher = user("new.teacher-004@weekly-task-it.edua.local", "New Teacher", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID taskId = seedTask(moderator.id(), Subject.MATH, oldTeacher.id(), LocalDate.now().plusWeeks(1),
                "Original lesson", Instant.now().plusSeconds(86_400), "SUBMITTED", null,
                "https://cdn.example.test/original.pdf", "original.pdf", Instant.now().minusSeconds(600), null, null, null);
        Instant newDeadline = Instant.now().plusSeconds(172_800);

        mockMvc.perform(patch("/api/weekly-tasks/{id}", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "teacherId": "%s",
                                  "weekStartDate": "%s",
                                  "scopeDescription": "Updated lesson scope",
                                  "deadline": "%s"
                                }
                                """.formatted(newTeacher.id(), LocalDate.now().plusWeeks(1), newDeadline)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teacherId").value(newTeacher.id().toString()))
                .andExpect(jsonPath("$.scopeDescription").value("Updated lesson scope"))
                .andExpect(jsonPath("$.reviewStatus").value("NOT_SUBMITTED"))
                .andExpect(jsonPath("$.sourceDocumentUrl").doesNotExist());

        Map<String, Object> task = requireTask(taskId);
        assertThat(task.get("teacher_id")).isEqualTo(newTeacher.id());
        assertThat(task.get("scope_description")).isEqualTo("Updated lesson scope");
        assertThat(task.get("review_status")).isEqualTo("NOT_SUBMITTED");
        assertThat(task.get("source_document_url")).isNull();
        assertThat(task.get("submitted_at")).isNull();
        verify(notificationStreamPort).publishNew(eq(oldTeacher.id()), any(NotificationEvent.class));
        verify(notificationStreamPort).publishNew(eq(newTeacher.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_WT_005_teacherSubmitsLessonPlanFromPersonalLibrary() throws Exception {
        AppUser moderator = user("moderator-005@weekly-task-it.edua.local", "Physics Moderator Five", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-005@weekly-task-it.edua.local", "Physics Teacher Five", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID taskId = seedTask(moderator.id(), Subject.PHYSICS, teacher.id(), LocalDate.now().plusWeeks(1),
                "Submit library lesson", Instant.now().plusSeconds(86_400), "NOT_SUBMITTED");
        UUID lessonPlanId = seedLibraryContent(teacher.id(), "Physics Library Lesson", "LESSON_PLAN", Subject.PHYSICS);

        mockMvc.perform(post("/api/weekly-tasks/{id}/submission", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"libraryContentId\":\"%s\"}".formatted(lessonPlanId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("SUBMITTED"))
                .andExpect(jsonPath("$.sourceLibraryContentId").value(lessonPlanId.toString()))
                .andExpect(jsonPath("$.sourceDocumentUrl").doesNotExist())
                .andExpect(jsonPath("$.submittedAt").exists());

        Map<String, Object> task = requireTask(taskId);
        assertThat(task.get("review_status")).isEqualTo("SUBMITTED");
        assertThat(task.get("source_library_content_id")).isEqualTo(lessonPlanId);
        assertThat(task.get("source_document_url")).isNull();
        assertThat(task.get("submitted_at")).isNotNull();
    }

    @Test
    void IT_WT_006_teacherUnsubmitsSubmittedLessonPlanBeforeReview() throws Exception {
        AppUser moderator = user("moderator-006@weekly-task-it.edua.local", "Chemistry Moderator Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-006@weekly-task-it.edua.local", "Chemistry Teacher Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID taskId = seedTask(moderator.id(), Subject.CHEMISTRY, teacher.id(), LocalDate.now().plusWeeks(1),
                "Unsubmit lesson", Instant.now().plusSeconds(86_400), "SUBMITTED", null,
                "https://cdn.example.test/lesson.pdf", "lesson.pdf", Instant.now().minusSeconds(600), null, null, null);

        mockMvc.perform(delete("/api/weekly-tasks/{id}/submission", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NOT_SUBMITTED"))
                .andExpect(jsonPath("$.sourceDocumentUrl").doesNotExist())
                .andExpect(jsonPath("$.submittedAt").doesNotExist());

        Map<String, Object> task = requireTask(taskId);
        assertThat(task.get("review_status")).isEqualTo("NOT_SUBMITTED");
        assertThat(task.get("source_document_url")).isNull();
        assertThat(task.get("source_document_name")).isNull();
        assertThat(task.get("submitted_at")).isNull();

        mockMvc.perform(delete("/api/weekly-tasks/{id}/submission", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void IT_WT_007_moderatorViewsSameSubjectLessonApprovalQueue() throws Exception {
        AppUser mathModerator = user("math.mod-007@weekly-task-it.edua.local", "Math Moderator Seven", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser chemistryModerator = user("chem.mod-007@weekly-task-it.edua.local", "Chemistry Moderator Seven", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser mathTeacher = user("math.teacher-007@weekly-task-it.edua.local", "Math Teacher Seven", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser chemistryTeacher = user("chem.teacher-007@weekly-task-it.edua.local", "Chemistry Teacher Seven", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        seedTask(mathModerator.id(), Subject.MATH, mathTeacher.id(), LocalDate.now().plusWeeks(1), "Math submitted queue", Instant.now().plusSeconds(86_400), "SUBMITTED");
        seedTask(mathModerator.id(), Subject.MATH, mathTeacher.id(), LocalDate.now().plusWeeks(1), "Math not submitted queue", Instant.now().plusSeconds(86_400), "NOT_SUBMITTED");
        seedTask(mathModerator.id(), Subject.MATH, mathTeacher.id(), LocalDate.now().plusWeeks(1), "Math approved queue", Instant.now().plusSeconds(86_400), "APPROVED");
        seedTask(chemistryModerator.id(), Subject.CHEMISTRY, chemistryTeacher.id(), LocalDate.now().plusWeeks(1), "Chemistry submitted queue", Instant.now().plusSeconds(86_400), "SUBMITTED");

        mockMvc.perform(get("/api/weekly-tasks/moderation-queue?page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(mathModerator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].scopeDescription", hasItem("Math submitted queue")))
                .andExpect(jsonPath("$.items[*].scopeDescription", not(hasItem("Math not submitted queue"))))
                .andExpect(jsonPath("$.items[*].scopeDescription", not(hasItem("Math approved queue"))))
                .andExpect(jsonPath("$.items[*].scopeDescription", not(hasItem("Chemistry submitted queue"))))
                .andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void IT_WT_008_moderatorApprovesSubmittedLessonPlan() throws Exception {
        AppUser moderator = user("moderator-008@weekly-task-it.edua.local", "Physics Moderator Eight", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-008@weekly-task-it.edua.local", "Physics Teacher Eight", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID taskId = seedTask(moderator.id(), Subject.PHYSICS, teacher.id(), LocalDate.now().plusWeeks(1),
                "Approve weekly lesson", Instant.now().plusSeconds(86_400), "SUBMITTED", null,
                "https://cdn.example.test/approve.pdf", "approve.pdf", Instant.now().minusSeconds(600), null, null, null);
        int beforeLogs = countActivity("APPROVE_WEEKLY_TASK");

        mockMvc.perform(post("/api/weekly-tasks/{id}/approval", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedBy").value(moderator.id().toString()))
                .andExpect(jsonPath("$.reviewedAt").exists())
                .andExpect(jsonPath("$.rejectionReason").doesNotExist());

        Map<String, Object> task = requireTask(taskId);
        assertThat(task.get("review_status")).isEqualTo("APPROVED");
        assertThat(task.get("reviewed_by")).isEqualTo(moderator.id());
        assertThat(task.get("reviewed_at")).isNotNull();
        assertThat(task.get("rejection_reason")).isNull();
        assertThat(countActivity("APPROVE_WEEKLY_TASK")).isEqualTo(beforeLogs + 1);
        assertActivityLog("APPROVE_WEEKLY_TASK", moderator.id(), taskId, null);
        verify(notificationStreamPort).publishNew(eq(teacher.id()), any(NotificationEvent.class));
    }

    @Test
    void IT_WT_009_moderatorRejectsSubmittedLessonPlanWithReason() throws Exception {
        AppUser moderator = user("moderator-009@weekly-task-it.edua.local", "Math Moderator Nine", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-009@weekly-task-it.edua.local", "Math Teacher Nine", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID taskId = seedTask(moderator.id(), Subject.MATH, teacher.id(), LocalDate.now().plusWeeks(1),
                "Reject weekly lesson", Instant.now().plusSeconds(86_400), "SUBMITTED");
        UUID blankReasonId = seedTask(moderator.id(), Subject.MATH, teacher.id(), LocalDate.now().plusWeeks(1),
                "Blank reject lesson", Instant.now().plusSeconds(86_400), "SUBMITTED");
        int beforeLogs = countActivity("REJECT_WEEKLY_TASK");

        mockMvc.perform(post("/api/weekly-tasks/{id}/rejection", taskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"  Missing objective detail  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Missing objective detail"))
                .andExpect(jsonPath("$.reviewedBy").value(moderator.id().toString()))
                .andExpect(jsonPath("$.reviewedAt").exists());

        Map<String, Object> task = requireTask(taskId);
        assertThat(task.get("review_status")).isEqualTo("REJECTED");
        assertThat(task.get("reviewed_by")).isEqualTo(moderator.id());
        assertThat(task.get("rejection_reason")).isEqualTo("Missing objective detail");
        assertThat(countActivity("REJECT_WEEKLY_TASK")).isEqualTo(beforeLogs + 1);
        assertActivityLog("REJECT_WEEKLY_TASK", moderator.id(), taskId, "Missing objective detail");

        mockMvc.perform(post("/api/weekly-tasks/{id}/rejection", blankReasonId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(requireTask(blankReasonId).get("review_status")).isEqualTo("SUBMITTED");
        assertThat(countActivity("REJECT_WEEKLY_TASK")).isEqualTo(beforeLogs + 1);
    }

    @Test
    void IT_WT_010_deniesWrongRoleWrongSubjectAndExpiredWeeklyTaskActions() throws Exception {
        AppUser mathModerator = user("math.mod-010@weekly-task-it.edua.local", "Math Moderator Ten", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser chemistryModerator = user("chem.mod-010@weekly-task-it.edua.local", "Chemistry Moderator Ten", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser assignedTeacher = user("assigned-010@weekly-task-it.edua.local", "Assigned Teacher Ten", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-010@weekly-task-it.edua.local", "Other Teacher Ten", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-010@weekly-task-it.edua.local", "Student Ten", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-010@weekly-task-it.edua.local", "Principal Ten", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        UUID submittedTaskId = seedTask(mathModerator.id(), Subject.MATH, assignedTeacher.id(), LocalDate.now().plusWeeks(1),
                "Protected submitted task", Instant.now().plusSeconds(86_400), "SUBMITTED");
        UUID expiredTaskId = seedTask(mathModerator.id(), Subject.MATH, assignedTeacher.id(), LocalDate.now().minusWeeks(1),
                "Expired task", Instant.now().minusSeconds(60), "NOT_SUBMITTED");
        String createPayload = """
                {
                  "teacherId": "%s",
                  "weekStartDate": "%s",
                  "scopeDescription": "Denied task",
                  "deadline": "%s"
                }
                """.formatted(assignedTeacher.id(), LocalDate.now().plusWeeks(1), Instant.now().plusSeconds(86_400));
        int beforeTasks = count("weekly_tasks");
        int beforeLogs = count("activity_logs");

        mockMvc.perform(get("/api/weekly-tasks"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/weekly-tasks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/weekly-tasks")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/weekly-tasks/{id}/submission", submittedTaskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"documentUrl\":\"https://cdn.example.test/other.pdf\",\"documentName\":\"other.pdf\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/weekly-tasks/{id}/approval", submittedTaskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(chemistryModerator, Role.MODERATOR)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/weekly-tasks/{id}/submission", expiredTaskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(assignedTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"documentUrl\":\"https://cdn.example.test/expired.pdf\",\"documentName\":\"expired.pdf\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(patch("/api/weekly-tasks/{id}", expiredTaskId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(mathModerator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createPayload))
                .andExpect(status().isBadRequest());

        assertThat(count("weekly_tasks")).isEqualTo(beforeTasks);
        assertThat(requireTask(submittedTaskId).get("review_status")).isEqualTo("SUBMITTED");
        assertThat(requireTask(expiredTaskId).get("review_status")).isEqualTo("NOT_SUBMITTED");
        assertThat(count("activity_logs")).isEqualTo(beforeLogs);
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status, Role role) {
        AppUser user = userRepository.save(new AppUser(
                UUID.randomUUID(), email, null, fullName, null, null, null, null, subject, status, Instant.now(), null, null));
        userRoleRepository.replaceRole(user.id(), role, user.id(), Instant.now());
        return user;
    }

    private void ensureTables() {
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_weekly_task_it");
        jdbc.execute("SET search_path TO edua_weekly_task_it");
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
                CREATE TABLE IF NOT EXISTS weekly_tasks (
                    id UUID PRIMARY KEY,
                    moderator_id UUID NOT NULL REFERENCES app_users (id),
                    subject VARCHAR(20) NOT NULL,
                    teacher_id UUID NOT NULL REFERENCES app_users (id),
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
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS library_contents (
                    id UUID PRIMARY KEY,
                    owner_id UUID NOT NULL REFERENCES app_users (id),
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

    private UUID seedTask(UUID moderatorId, Subject subject, UUID teacherId, LocalDate weekStartDate,
                          String scope, Instant deadline, String reviewStatus) {
        return seedTask(moderatorId, subject, teacherId, weekStartDate, scope, deadline, reviewStatus,
                null, null, null, reviewStatus.equals("SUBMITTED") ? Instant.now().minusSeconds(600) : null,
                null, null, null);
    }

    private UUID seedTask(UUID moderatorId, Subject subject, UUID teacherId, LocalDate weekStartDate,
                          String scope, Instant deadline, String reviewStatus, UUID sourceLibraryContentId,
                          String sourceDocumentUrl, String sourceDocumentName, Instant submittedAt,
                          UUID reviewedBy, Instant reviewedAt, String rejectionReason) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO weekly_tasks (
                    id, moderator_id, subject, teacher_id, week_start_date, scope_description, deadline,
                    review_status, source_library_content_id, source_document_url, source_document_name,
                    submitted_at, reviewed_by, reviewed_at, rejection_reason, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, moderatorId, subject.name(), teacherId, Date.valueOf(weekStartDate), scope,
                Timestamp.from(deadline), reviewStatus, sourceLibraryContentId, sourceDocumentUrl, sourceDocumentName,
                submittedAt == null ? null : Timestamp.from(submittedAt), reviewedBy,
                reviewedAt == null ? null : Timestamp.from(reviewedAt), rejectionReason,
                Timestamp.from(now), Timestamp.from(now));
        return id;
    }

    private UUID seedLibraryContent(UUID ownerId, String title, String type, Subject subject) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO library_contents (
                    id, owner_id, type, title, subject, status, payload, thumbnail_url, created_at,
                    updated_at, submitted_at, deleted_at, reviewed_by, reviewed_at, rejection_reason
                )
                VALUES (?, ?, ?, ?, ?, 'PRIVATE', '{}'::jsonb, null, ?, ?, null, null, null, null, null)
                """,
                id, ownerId, type, title, subject == null ? null : subject.name(), Timestamp.from(now), Timestamp.from(now));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_weekly_task_it");
        jdbc.update("DELETE FROM activity_logs");
        jdbc.update("DELETE FROM notification_recipients");
        jdbc.update("DELETE FROM notifications");
        jdbc.update("DELETE FROM weekly_tasks");
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

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private int countTasksForSubjectAndWeek(String subject, LocalDate weekStartDate) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM weekly_tasks WHERE subject = ? AND week_start_date = ?",
                Integer.class,
                subject,
                Date.valueOf(weekStartDate));
        return count == null ? 0 : count;
    }

    private int countTasksForTeacher(UUID teacherId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM weekly_tasks WHERE teacher_id = ?", Integer.class, teacherId);
        return count == null ? 0 : count;
    }

    private int countActivity(String action) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM activity_logs WHERE action = ?", Integer.class, action);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireTask(UUID id) {
        return jdbc.queryForMap("SELECT * FROM weekly_tasks WHERE id = ?", id);
    }

    private Map<String, Object> requireTaskByScope(String scope) {
        return jdbc.queryForMap("SELECT * FROM weekly_tasks WHERE scope_description = ?", scope);
    }

    private boolean hasNotificationRecipient(UUID recipientId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM notification_recipients WHERE recipient_id = ?",
                Integer.class,
                recipientId);
        return count != null && count > 0;
    }

    private void assertActivityLog(String action, UUID actorId, UUID targetId, String metadata) {
        Map<String, Object> log = jdbc.queryForMap(
                "SELECT * FROM activity_logs WHERE action = ? AND actor_id = ? AND target_id = ?",
                action,
                actorId,
                targetId);
        assertThat(log.get("actor_role")).isEqualTo("MODERATOR");
        assertThat(log.get("category")).isEqualTo("MODERATION");
        assertThat(log.get("target_type")).isEqualTo("WEEKLY_TASK");
        assertThat(log.get("metadata")).isEqualTo(metadata);
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
