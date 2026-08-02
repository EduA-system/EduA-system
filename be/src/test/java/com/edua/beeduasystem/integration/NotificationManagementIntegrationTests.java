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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_notification_management_it",
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
class NotificationManagementIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@notification-management-it.edua.local";

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
    void IT_NM_001_moderatorCreatesNotificationForSameSubjectTeachers() throws Exception {
        AppUser moderator = user("moderator-001@notification-management-it.edua.local", "Math Moderator", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser mathTeacherOne = user("teacher1-001@notification-management-it.edua.local", "Math Teacher One", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser mathTeacherTwo = user("teacher2-001@notification-management-it.edua.local", "Math Teacher Two", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser physicsTeacher = user("physics-001@notification-management-it.edua.local", "Physics Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        user("student-001@notification-management-it.edua.local", "Math Student", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        int beforeNotifications = count("notifications");
        int beforeRecipients = count("notification_recipients");

        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "  Weekly update  ",
                                  "content": "  Prepare lesson plans  "
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Weekly update"))
                .andExpect(jsonPath("$.content").value("Prepare lesson plans"))
                .andExpect(jsonPath("$.subject").value("MATH"))
                .andExpect(jsonPath("$.senderName").value("Math Moderator"))
                .andExpect(jsonPath("$.recipientCount").value(2));

        assertThat(count("notifications")).isEqualTo(beforeNotifications + 1);
        assertThat(count("notification_recipients")).isEqualTo(beforeRecipients + 2);
        Map<String, Object> notification = requireSingleNotificationByTitle("Weekly update");
        assertThat(notification.get("sender_id")).isEqualTo(moderator.id());
        assertThat(notification.get("subject")).isEqualTo("MATH");
        assertRecipientIds(notification.get("id"), List.of(mathTeacherOne.id(), mathTeacherTwo.id()));
        assertThat(hasRecipient(notification.get("id"), physicsTeacher.id())).isFalse();
        verify(notificationStreamPort).publishNew(eq(mathTeacherOne.id()), any(NotificationEvent.class));
        verify(notificationStreamPort).publishNew(eq(mathTeacherTwo.id()), any(NotificationEvent.class));
        verify(notificationStreamPort, times(2)).publishNew(any(UUID.class), any(NotificationEvent.class));

        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"   \",\"content\":\"Valid content\"}"))
                .andExpect(status().isBadRequest());

        assertThat(count("notifications")).isEqualTo(beforeNotifications + 1);
        assertThat(count("notification_recipients")).isEqualTo(beforeRecipients + 2);
    }

    @Test
    void IT_NM_002_authenticatedUserViewsOwnNotifications() throws Exception {
        AppUser moderator = user("moderator-002@notification-management-it.edua.local", "Chemistry Moderator", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-002@notification-management-it.edua.local", "Chemistry Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-002@notification-management-it.edua.local", "Other Teacher", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID olderRead = seedNotification(moderator.id(), Subject.CHEMISTRY, "Older Read Notification", "Already read", Instant.now().minusSeconds(120));
        UUID newerUnread = seedNotification(moderator.id(), Subject.CHEMISTRY, "Newer Unread Notification", "Unread content", Instant.now());
        UUID otherOnly = seedNotification(moderator.id(), Subject.CHEMISTRY, "Other Recipient Notification", "Private to other", Instant.now().plusSeconds(10));
        seedRecipient(olderRead, teacher.id(), Instant.now().minusSeconds(60));
        seedRecipient(newerUnread, teacher.id(), null);
        seedRecipient(otherOnly, otherTeacher.id(), null);

        mockMvc.perform(get("/api/notifications?unread=false&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Newer Unread Notification")))
                .andExpect(jsonPath("$.items[*].title", hasItem("Older Read Notification")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Other Recipient Notification"))))
                .andExpect(jsonPath("$.items[0].title").value("Newer Unread Notification"))
                .andExpect(jsonPath("$.items[0].read").value(false))
                .andExpect(jsonPath("$.items[0].senderName").value("Chemistry Moderator"))
                .andExpect(jsonPath("$.items[1].read").value(true))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.unreadCount").value(1));

        mockMvc.perform(get("/api/notifications?unread=true&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Newer Unread Notification")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Older Read Notification"))))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void IT_NM_003_authenticatedUserViewsUnreadCount() throws Exception {
        AppUser moderator = user("moderator-003@notification-management-it.edua.local", "Physics Moderator", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-003@notification-management-it.edua.local", "Physics Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-003@notification-management-it.edua.local", "Other Physics Teacher", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID unreadOne = seedNotification(moderator.id(), Subject.PHYSICS, "Unread One", "Content", Instant.now());
        UUID unreadTwo = seedNotification(moderator.id(), Subject.PHYSICS, "Unread Two", "Content", Instant.now());
        UUID readOne = seedNotification(moderator.id(), Subject.PHYSICS, "Read One", "Content", Instant.now());
        UUID otherUnread = seedNotification(moderator.id(), Subject.PHYSICS, "Other Unread", "Content", Instant.now());
        seedRecipient(unreadOne, teacher.id(), null);
        seedRecipient(unreadTwo, teacher.id(), null);
        seedRecipient(readOne, teacher.id(), Instant.now());
        seedRecipient(otherUnread, otherTeacher.id(), null);

        mockMvc.perform(get("/api/notifications/unread-count")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));
    }

    @Test
    void IT_NM_004_authenticatedUserMarksOneNotificationRead() throws Exception {
        AppUser moderator = user("moderator-004@notification-management-it.edua.local", "Math Moderator Four", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-004@notification-management-it.edua.local", "Teacher Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-004@notification-management-it.edua.local", "Other Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID notificationId = seedNotification(moderator.id(), Subject.MATH, "Read One Target", "Content", Instant.now());
        UUID otherOnlyId = seedNotification(moderator.id(), Subject.MATH, "Other User Target", "Content", Instant.now());
        seedRecipient(notificationId, teacher.id(), null);
        seedRecipient(notificationId, otherTeacher.id(), null);
        seedRecipient(otherOnlyId, otherTeacher.id(), null);

        mockMvc.perform(patch("/api/notifications/{id}/read", notificationId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(requireRecipient(notificationId, teacher.id()).get("read_at")).isNotNull();
        assertThat(requireRecipient(notificationId, otherTeacher.id()).get("read_at")).isNull();

        mockMvc.perform(patch("/api/notifications/{id}/read", otherOnlyId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNotFound());

        assertThat(requireRecipient(otherOnlyId, otherTeacher.id()).get("read_at")).isNull();
    }

    @Test
    void IT_NM_005_authenticatedUserMarksAllOwnNotificationsRead() throws Exception {
        AppUser moderator = user("moderator-005@notification-management-it.edua.local", "Chemistry Moderator Five", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-005@notification-management-it.edua.local", "Teacher Five", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-005@notification-management-it.edua.local", "Other Five", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID unreadOne = seedNotification(moderator.id(), Subject.CHEMISTRY, "Unread All One", "Content", Instant.now());
        UUID unreadTwo = seedNotification(moderator.id(), Subject.CHEMISTRY, "Unread All Two", "Content", Instant.now());
        UUID alreadyRead = seedNotification(moderator.id(), Subject.CHEMISTRY, "Already Read All", "Content", Instant.now());
        UUID otherUnread = seedNotification(moderator.id(), Subject.CHEMISTRY, "Other Stays Unread", "Content", Instant.now());
        seedRecipient(unreadOne, teacher.id(), null);
        seedRecipient(unreadTwo, teacher.id(), null);
        seedRecipient(alreadyRead, teacher.id(), Instant.now().minusSeconds(30));
        seedRecipient(otherUnread, otherTeacher.id(), null);
        int beforeNotifications = count("notifications");

        mockMvc.perform(post("/api/notifications/read-all")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(count("notifications")).isEqualTo(beforeNotifications);
        assertThat(unreadCount(teacher.id())).isZero();
        assertThat(requireRecipient(unreadOne, teacher.id()).get("read_at")).isNotNull();
        assertThat(requireRecipient(unreadTwo, teacher.id()).get("read_at")).isNotNull();
        assertThat(requireRecipient(alreadyRead, teacher.id()).get("read_at")).isNotNull();
        assertThat(requireRecipient(otherUnread, otherTeacher.id()).get("read_at")).isNull();
    }

    @Test
    void IT_NM_006_deniesCreateNotificationForGuestAndWrongRoles() throws Exception {
        AppUser teacher = user("teacher-006@notification-management-it.edua.local", "Teacher Six", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-006@notification-management-it.edua.local", "Student Six", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser principal = user("principal-006@notification-management-it.edua.local", "Principal Six", null, UserStatus.ACTIVE, Role.PRINCIPAL);
        AppUser noSubjectModerator = user("moderator-006@notification-management-it.edua.local", "No Subject Moderator", null, UserStatus.ACTIVE, Role.MODERATOR);
        String payload = "{\"title\":\"Denied notification\",\"content\":\"Should not be sent\"}";
        int beforeNotifications = count("notifications");
        int beforeRecipients = count("notification_recipients");

        mockMvc.perform(post("/api/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(principal, Role.PRINCIPAL))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/notifications")
                        .header(HttpHeaders.AUTHORIZATION, bearer(noSubjectModerator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());

        assertThat(count("notifications")).isEqualTo(beforeNotifications);
        assertThat(count("notification_recipients")).isEqualTo(beforeRecipients);
        verifyNoInteractions(notificationStreamPort);
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_notification_management_it");
        jdbc.execute("SET search_path TO edua_notification_management_it");
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

    private UUID seedNotification(UUID senderId, Subject subject, String title, String content, Instant createdAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO notifications (id, sender_id, subject, title, content, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                id,
                senderId,
                subject.name(),
                title,
                content,
                Timestamp.from(createdAt));
        return id;
    }

    private UUID seedRecipient(UUID notificationId, UUID recipientId, Instant readAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO notification_recipients (id, notification_id, recipient_id, read_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                id,
                notificationId,
                recipientId,
                readAt == null ? null : Timestamp.from(readAt),
                Timestamp.from(Instant.now()));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_notification_management_it");
        jdbc.update("DELETE FROM notification_recipients");
        jdbc.update("DELETE FROM notifications");
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

    private long unreadCount(UUID recipientId) {
        Long count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM notification_recipients WHERE recipient_id = ? AND read_at IS NULL",
                Long.class,
                recipientId);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requireSingleNotificationByTitle(String title) {
        return jdbc.queryForMap("SELECT * FROM notifications WHERE title = ?", title);
    }

    private Map<String, Object> requireRecipient(Object notificationId, UUID recipientId) {
        return jdbc.queryForMap(
                "SELECT * FROM notification_recipients WHERE notification_id = ? AND recipient_id = ?",
                notificationId,
                recipientId);
    }

    private boolean hasRecipient(Object notificationId, UUID recipientId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM notification_recipients WHERE notification_id = ? AND recipient_id = ?",
                Integer.class,
                notificationId,
                recipientId);
        return count != null && count > 0;
    }

    private void assertRecipientIds(Object notificationId, List<UUID> expectedRecipientIds) {
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
