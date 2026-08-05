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
import static org.hamcrest.Matchers.containsString;
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
        "spring.datasource.hikari.connection-init-sql=SET search_path TO edua_blog_it",
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
class BlogIntegrationTests {

    private static final String TEST_EMAIL_PATTERN = "%@blog-it.edua.local";

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
    void IT_BL_001_authenticatedUserViewsPublishedBlogList() throws Exception {
        AppUser author = user("author-001@blog-it.edua.local", "Blog Author One", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser viewer = user("viewer-001@blog-it.edua.local", "Viewer One", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID visibleId = seedPost(author.id(), "Visible Math Blog", "<p>Visible <strong>content</strong></p>", Subject.MATH, "PUBLISHED", null, null);
        seedComment(visibleId, viewer.id(), "First comment");
        seedComment(visibleId, author.id(), "Second comment");
        seedPost(author.id(), "Visible Physics Blog", "<p>Other subject</p>", Subject.PHYSICS, "PUBLISHED", null, null);
        seedPost(author.id(), "Visible Removed Blog", "<p>Removed</p>", Subject.MATH, "REMOVED_BY_MODERATOR", "Violation", viewer.id());
        seedPost(author.id(), "Visible Deleted Blog", "<p>Deleted</p>", Subject.MATH, "DELETED_BY_AUTHOR", null, null);
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/blog-posts?subject=MATH&q=Visible&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(viewer, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Visible Math Blog")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Visible Physics Blog"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Visible Removed Blog"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Visible Deleted Blog"))))
                .andExpect(jsonPath("$.items[0].authorName").value("Blog Author One"))
                .andExpect(jsonPath("$.items[0].commentCount").value(2))
                .andExpect(jsonPath("$.items[0].excerpt", containsString("Visible")))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_BL_002_authenticatedUserViewsPublishedBlogDetail() throws Exception {
        AppUser author = user("author-002@blog-it.edua.local", "Blog Author Two", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-002@blog-it.edua.local", "Commenter Two", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(author.id(), "Published Detail Blog", "<p>Detail content</p>", Subject.PHYSICS, "PUBLISHED", null, null);
        UUID removedId = seedPost(author.id(), "Removed Detail Blog", "<p>Removed content</p>", Subject.PHYSICS, "REMOVED_BY_MODERATOR", "Outdated", commenter.id());
        seedComment(postId, commenter.id(), "Detail comment");

        mockMvc.perform(get("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(postId.toString()))
                .andExpect(jsonPath("$.title").value("Published Detail Blog"))
                .andExpect(jsonPath("$.content", containsString("Detail content")))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.authorName").value("Blog Author Two"))
                .andExpect(jsonPath("$.comments[0].content").value("Detail comment"))
                .andExpect(jsonPath("$.comments[0].authorName").value("Commenter Two"));

        mockMvc.perform(get("/api/blog-posts/{id}", removedId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER)))
                .andExpect(status().isNotFound());
    }

    @Test
    void IT_BL_003_teacherCreatesSanitizedBlogPost() throws Exception {
        AppUser teacher = user("teacher-003@blog-it.edua.local", "Teacher Three", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        int beforePosts = count("blog_posts");

        mockMvc.perform(post("/api/blog-posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "  New Blog Post  ",
                                  "subject": "CHEMISTRY",
                                  "content": "<p>Hello <script>alert(1)</script><strong>blog</strong></p>"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("New Blog Post"))
                .andExpect(jsonPath("$.subject").value("CHEMISTRY"))
                .andExpect(jsonPath("$.authorId").value(teacher.id().toString()))
                .andExpect(jsonPath("$.content", containsString("Hello")))
                .andExpect(jsonPath("$.content", containsString("blog")));

        assertThat(count("blog_posts")).isEqualTo(beforePosts + 1);
        Map<String, Object> post = requireSinglePostByTitle("New Blog Post");
        assertThat(post.get("author_id")).isEqualTo(teacher.id());
        assertThat(post.get("status")).isEqualTo("PUBLISHED");
        assertThat((String) post.get("content")).contains("Hello", "blog").doesNotContain("script");

        mockMvc.perform(post("/api/blog-posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\" \",\"subject\":\"CHEMISTRY\",\"content\":\"<p>Body</p>\"}"))
                .andExpect(status().isBadRequest());

        assertThat(count("blog_posts")).isEqualTo(beforePosts + 1);
    }

    @Test
    void IT_BL_004_teacherUpdatesOwnBlogPost() throws Exception {
        AppUser teacher = user("teacher-004@blog-it.edua.local", "Teacher Four", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(teacher.id(), "Original Blog Title", "<p>Original content</p>", Subject.MATH, "PUBLISHED", null, null);
        Map<String, Object> before = requirePost(postId);

        mockMvc.perform(patch("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Updated Blog Title",
                                  "subject": "PHYSICS",
                                  "content": "<p>Updated <script>alert(1)</script>content</p>"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(postId.toString()))
                .andExpect(jsonPath("$.title").value("Updated Blog Title"))
                .andExpect(jsonPath("$.subject").value("PHYSICS"))
                .andExpect(jsonPath("$.content", containsString("Updated")));

        Map<String, Object> after = requirePost(postId);
        assertThat(after.get("author_id")).isEqualTo(before.get("author_id"));
        assertThat(after.get("status")).isEqualTo("PUBLISHED");
        assertThat(after.get("title")).isEqualTo("Updated Blog Title");
        assertThat(after.get("subject")).isEqualTo("PHYSICS");
        assertThat((String) after.get("content")).contains("Updated", "content").doesNotContain("script");
        assertThat(after.get("updated_at")).isNotEqualTo(before.get("updated_at"));
    }

    @Test
    void IT_BL_005_teacherDeletesOwnBlogPost() throws Exception {
        AppUser teacher = user("teacher-005@blog-it.edua.local", "Teacher Five", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(teacher.id(), "Delete Own Blog", "<p>Delete me</p>", Subject.MATH, "PUBLISHED", null, null);

        mockMvc.perform(delete("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(requirePost(postId).get("status")).isEqualTo("DELETED_BY_AUTHOR");

        mockMvc.perform(get("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/blog-posts?q=Delete Own Blog")
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void IT_BL_006_teacherCreatesCommentOnPublishedBlogPost() throws Exception {
        AppUser author = user("author-006@blog-it.edua.local", "Author Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-006@blog-it.edua.local", "Commenter Six", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(author.id(), "Comment Target Blog", "<p>Comment target</p>", Subject.CHEMISTRY, "PUBLISHED", null, null);
        UUID deletedPostId = seedPost(author.id(), "Deleted Comment Target", "<p>Deleted</p>", Subject.CHEMISTRY, "DELETED_BY_AUTHOR", null, null);
        int beforeComments = count("blog_comments");

        mockMvc.perform(post("/api/blog-posts/{id}/comments", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "<p>Nice <script>alert(1)</script><strong>post</strong></p>"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.authorId").value(commenter.id().toString()))
                .andExpect(jsonPath("$.authorName").value("Commenter Six"))
                .andExpect(jsonPath("$.content", containsString("Nice")))
                .andExpect(jsonPath("$.content", containsString("post")));

        assertThat(count("blog_comments")).isEqualTo(beforeComments + 1);
        Map<String, Object> comment = requireSingleComment(postId);
        assertThat(comment.get("post_id")).isEqualTo(postId);
        assertThat(comment.get("author_id")).isEqualTo(commenter.id());
        assertThat((String) comment.get("content")).contains("Nice", "post").doesNotContain("script");

        mockMvc.perform(post("/api/blog-posts/{id}/comments", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/blog-posts/{id}/comments", deletedPostId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Comment\"}"))
                .andExpect(status().isNotFound());

        assertThat(count("blog_comments")).isEqualTo(beforeComments + 1);
    }

    @Test
    void IT_BL_007_teacherUpdatesOwnBlogComment() throws Exception {
        AppUser author = user("author-007@blog-it.edua.local", "Author Seven", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-007@blog-it.edua.local", "Commenter Seven", Subject.PHYSICS, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(author.id(), "Update Comment Blog", "<p>Body</p>", Subject.PHYSICS, "PUBLISHED", null, null);
        UUID commentId = seedComment(postId, commenter.id(), "Original comment");
        Map<String, Object> before = requireComment(commentId);

        mockMvc.perform(patch("/api/blog-comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"<p>Updated <script>alert(1)</script>comment</p>\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(commentId.toString()))
                .andExpect(jsonPath("$.content", containsString("Updated")))
                .andExpect(jsonPath("$.authorName").value("Commenter Seven"));

        Map<String, Object> after = requireComment(commentId);
        assertThat(after.get("post_id")).isEqualTo(before.get("post_id"));
        assertThat(after.get("author_id")).isEqualTo(before.get("author_id"));
        assertThat((String) after.get("content")).contains("Updated", "comment").doesNotContain("script");

        mockMvc.perform(patch("/api/blog-comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(requireComment(commentId).get("content")).isEqualTo(after.get("content"));
    }

    @Test
    void IT_BL_008_teacherDeletesOwnBlogComment() throws Exception {
        AppUser author = user("author-008@blog-it.edua.local", "Author Eight", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-008@blog-it.edua.local", "Commenter Eight", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(author.id(), "Delete Comment Blog", "<p>Body</p>", Subject.MATH, "PUBLISHED", null, null);
        UUID deleteId = seedComment(postId, commenter.id(), "Delete my comment");
        UUID keepId = seedComment(postId, author.id(), "Keep comment");

        mockMvc.perform(delete("/api/blog-comments/{commentId}", deleteId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(commenter, Role.TEACHER)))
                .andExpect(status().isNoContent());

        assertThat(commentExists(deleteId)).isFalse();
        assertThat(commentExists(keepId)).isTrue();
    }

    @Test
    void IT_BL_009_postAuthorSoftHidesAnotherUsersComment() throws Exception {
        AppUser author = user("author-009@blog-it.edua.local", "Author Nine", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser commenter = user("commenter-009@blog-it.edua.local", "Commenter Nine", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser outsider = user("outsider-009@blog-it.edua.local", "Outsider Nine", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(author.id(), "Hide Comment Blog", "<p>Body</p>", Subject.MATH, "PUBLISHED", null, null);
        UUID commentId = seedComment(postId, commenter.id(), "Hide this comment");

        mockMvc.perform(post("/api/blog-comments/{commentId}/hide", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(author, Role.TEACHER)))
                .andExpect(status().isNoContent());

        Map<String, Object> hidden = requireComment(commentId);
        assertThat(hidden.get("hidden_at")).isNotNull();
        assertThat(hidden.get("hidden_by")).isEqualTo(author.id());
        mockMvc.perform(get("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(author, Role.TEACHER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comments").isEmpty());
        mockMvc.perform(post("/api/blog-comments/{commentId}/hide", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(outsider, Role.TEACHER)))
                .andExpect(status().isNotFound());
    }

    @Test
    void IT_BL_010_moderatorViewsSameSubjectBlogModerationList() throws Exception {
        AppUser moderator = user("moderator-009@blog-it.edua.local", "Math Moderator Nine", Subject.MATH, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-009@blog-it.edua.local", "Teacher Nine", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        seedPost(teacher.id(), "Math Moderation Candidate", "<p>Math post</p>", Subject.MATH, "PUBLISHED", null, null);
        seedPost(teacher.id(), "Physics Moderation Candidate", "<p>Physics post</p>", Subject.PHYSICS, "PUBLISHED", null, null);
        seedPost(teacher.id(), "Math Already Removed", "<p>Removed</p>", Subject.MATH, "REMOVED_BY_MODERATOR", "Violation", moderator.id());
        Map<String, Integer> before = tableCounts();

        mockMvc.perform(get("/api/blog-posts?subject=MATH&page=0&size=20")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].title", hasItem("Math Moderation Candidate")))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Physics Moderation Candidate"))))
                .andExpect(jsonPath("$.items[*].title", not(hasItem("Math Already Removed"))))
                .andExpect(jsonPath("$.total").value(1));

        assertThat(tableCounts()).isEqualTo(before);
    }

    @Test
    void IT_BL_010_moderatorRemovesSameSubjectBlogPost() throws Exception {
        AppUser moderator = user("moderator-010@blog-it.edua.local", "Chemistry Moderator Ten", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.MODERATOR);
        AppUser teacher = user("teacher-010@blog-it.edua.local", "Teacher Ten", Subject.CHEMISTRY, UserStatus.ACTIVE, Role.TEACHER);
        UUID postId = seedPost(teacher.id(), "Remove Blog Candidate", "<p>Remove me</p>", Subject.CHEMISTRY, "PUBLISHED", null, null);
        UUID blankReasonId = seedPost(teacher.id(), "Blank Reason Candidate", "<p>Keep me</p>", Subject.CHEMISTRY, "PUBLISHED", null, null);
        int beforeLogs = countActivity("REMOVE_BLOG_POST");

        mockMvc.perform(post("/api/blog-posts/{id}/removal", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"  Inappropriate content  \"}"))
                .andExpect(status().isNoContent());

        Map<String, Object> row = requirePost(postId);
        assertThat(row.get("status")).isEqualTo("REMOVED_BY_MODERATOR");
        assertThat(row.get("removed_by")).isEqualTo(moderator.id());
        assertThat(row.get("removed_reason")).isEqualTo("Inappropriate content");
        assertThat(countActivity("REMOVE_BLOG_POST")).isEqualTo(beforeLogs + 1);
        assertActivityLog("REMOVE_BLOG_POST", moderator.id(), postId, "Inappropriate content");

        mockMvc.perform(get("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(teacher, Role.TEACHER)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/blog-posts/{id}/removal", blankReasonId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(requirePost(blankReasonId).get("status")).isEqualTo("PUBLISHED");
        assertThat(countActivity("REMOVE_BLOG_POST")).isEqualTo(beforeLogs + 1);
    }

    @Test
    void IT_BL_011_deniesGuestWrongRoleNonOwnerAndWrongSubjectBlogActions() throws Exception {
        AppUser owner = user("owner-011@blog-it.edua.local", "Owner Eleven", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser otherTeacher = user("other-011@blog-it.edua.local", "Other Eleven", Subject.MATH, UserStatus.ACTIVE, Role.TEACHER);
        AppUser student = user("student-011@blog-it.edua.local", "Student Eleven", Subject.MATH, UserStatus.ACTIVE, Role.STUDENT);
        AppUser moderator = user("moderator-011@blog-it.edua.local", "Moderator Eleven", Subject.PHYSICS, UserStatus.ACTIVE, Role.MODERATOR);
        UUID postId = seedPost(owner.id(), "Protected Blog Post", "<p>Protected body</p>", Subject.MATH, "PUBLISHED", null, null);
        UUID commentId = seedComment(postId, owner.id(), "Protected comment");
        Map<String, Object> beforePost = requirePost(postId);
        Map<String, Object> beforeComment = requireComment(commentId);
        int beforeLogs = count("activity_logs");

        mockMvc.perform(get("/api/blog-posts"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/blog-posts/{id}", postId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/blog-posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(student, Role.STUDENT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Student Post\",\"subject\":\"MATH\",\"content\":\"<p>Body</p>\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/blog-posts")
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Moderator Post\",\"subject\":\"MATH\",\"content\":\"<p>Body</p>\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hacked\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/blog-posts/{id}", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherTeacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/blog-comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherTeacher, Role.TEACHER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Hacked comment\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/blog-comments/{commentId}", commentId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(otherTeacher, Role.TEACHER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/blog-posts/{id}/removal", postId)
                        .header(HttpHeaders.AUTHORIZATION, bearer(moderator, Role.MODERATOR))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Wrong subject\"}"))
                .andExpect(status().isForbidden());

        assertUnchangedPost(beforePost, requirePost(postId));
        assertThat(requireComment(commentId)).containsEntry("content", beforeComment.get("content"));
        assertThat(count("activity_logs")).isEqualTo(beforeLogs);
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
        jdbc.execute("CREATE SCHEMA IF NOT EXISTS edua_blog_it");
        jdbc.execute("SET search_path TO edua_blog_it");
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
                CREATE TABLE IF NOT EXISTS blog_posts (
                    id UUID PRIMARY KEY,
                    author_id UUID NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    thumbnail_url VARCHAR(1000),
                    subject VARCHAR(20) NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    removed_reason TEXT,
                    removed_by UUID,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL
                )
                """);
        jdbc.execute("ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(1000)");
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS blog_comments (
                    id UUID PRIMARY KEY,
                    post_id UUID NOT NULL,
                    author_id UUID NOT NULL,
                    parent_comment_id UUID,
                    content TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL,
                    hidden_at TIMESTAMPTZ,
                    hidden_by UUID
                )
                """);
        jdbc.execute("ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ");
        jdbc.execute("ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS hidden_by UUID");
        jdbc.execute("ALTER TABLE blog_comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID");
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

    private UUID seedPost(UUID authorId, String title, String content, Subject subject, String status,
                          String removedReason, UUID removedBy) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO blog_posts (
                    id, author_id, title, content, subject, status, removed_reason, removed_by, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id,
                authorId,
                title,
                content,
                subject.name(),
                status,
                removedReason,
                removedBy,
                Timestamp.from(now),
                Timestamp.from(now));
        return id;
    }

    private UUID seedComment(UUID postId, UUID authorId, String content) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO blog_comments (id, post_id, author_id, content, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, id, postId, authorId, content, Timestamp.from(now), Timestamp.from(now));
        return id;
    }

    private void deleteTestData() {
        jdbc.execute("SET search_path TO edua_blog_it");
        jdbc.update("DELETE FROM blog_comments");
        jdbc.update("DELETE FROM activity_logs");
        jdbc.update("DELETE FROM blog_posts");
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
                "blog_posts", count("blog_posts"),
                "blog_comments", count("blog_comments"),
                "activity_logs", count("activity_logs"));
    }

    private int count(String tableName) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM " + tableName, Integer.class);
        return count == null ? 0 : count;
    }

    private int countActivity(String action) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM activity_logs WHERE action = ?", Integer.class, action);
        return count == null ? 0 : count;
    }

    private Map<String, Object> requirePost(UUID id) {
        return jdbc.queryForMap("SELECT * FROM blog_posts WHERE id = ?", id);
    }

    private Map<String, Object> requireSinglePostByTitle(String title) {
        return jdbc.queryForMap("SELECT * FROM blog_posts WHERE title = ?", title);
    }

    private Map<String, Object> requireComment(UUID id) {
        return jdbc.queryForMap("SELECT * FROM blog_comments WHERE id = ?", id);
    }

    private Map<String, Object> requireSingleComment(UUID postId) {
        return jdbc.queryForMap("SELECT * FROM blog_comments WHERE post_id = ?", postId);
    }

    private boolean commentExists(UUID id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM blog_comments WHERE id = ?", Integer.class, id);
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
        assertThat(log.get("target_type")).isEqualTo("BLOG_POST");
        assertThat(log.get("metadata")).isEqualTo(metadata);
        assertThat(log.get("created_at")).isNotNull();
    }

    private void assertUnchangedPost(Map<String, Object> before, Map<String, Object> after) {
        assertThat(after.get("title")).isEqualTo(before.get("title"));
        assertThat(after.get("content")).isEqualTo(before.get("content"));
        assertThat(after.get("subject")).isEqualTo(before.get("subject"));
        assertThat(after.get("status")).isEqualTo(before.get("status"));
        assertThat(after.get("removed_reason")).isEqualTo(before.get("removed_reason"));
        assertThat(after.get("removed_by")).isEqualTo(before.get("removed_by"));
    }

    private String bearer(AppUser user, Role role) {
        return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
    }
}
