# EDUA Database ERD Specification

Nguồn phân tích: Flyway migrations trong `be/src/main/resources/db/migration` từ `V1` đến `V41`, đối chiếu với các JPA entity trong `be/src/main/java/com/edua/beeduasystem/infrastructure/persistence/entity`.

Phạm vi: chỉ phân tích schema. Không chạy migration, không kết nối database, không thay đổi dữ liệu.

Ghi chú quan trọng:

- `spring.jpa.hibernate.ddl-auto=update`, nhưng đặc tả dưới đây ưu tiên constraint vật lý từ migration.
- `V15__create_class_management.sql` từng tạo `classes`/`class_members` kiểu `BIGSERIAL` và FK tới bảng `users`, nhưng `V23__fix_class_management_schema.sql` đã `DROP TABLE IF EXISTS` và tạo lại bằng `UUID` FK tới `app_users`. ERD nên dùng schema sau `V23`.
- `flyway_schema_history` là bảng metadata do Flyway tự tạo, không phải business entity của hệ thống. Nếu vẽ physical database đầy đủ tuyệt đối, có thể thêm bảng này riêng; nó không có relationship nghiệp vụ.
- Các cột `target_id`, `textbook_code`, `chapter_code`, `lesson_code`, `target_url`, file id/url là tham chiếu logic hoặc dữ liệu ngoài, không có FK vật lý trừ khi ghi rõ.

## 1. Entity / Table

### `textbooks`

Catalog sách giáo khoa gốc.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| code | VARCHAR(20) | NOT NULL | UNIQUE | - |
| name | VARCHAR(200) | NOT NULL | - | - |
| grade | INTEGER | NOT NULL | - | - |
| source | VARCHAR(200) | NULL | - | - |
| publisher | VARCHAR(200) | NULL | - | - |
| series | VARCHAR(200) | NULL | - | - |

Indexes/constraints: `textbooks_pkey`, unique on `code`.

### `chapters`

Chương thuộc một sách giáo khoa.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| textbook_id | UUID | NOT NULL | FK, composite UNIQUE | `textbooks.id` |
| code | VARCHAR(20) | NOT NULL | composite UNIQUE | - |
| name | VARCHAR(500) | NOT NULL | - | - |
| sort_order | INTEGER | NOT NULL | - | - |

Indexes/constraints: `uq_chapters_textbook_code` unique (`textbook_id`, `code`), `idx_chapters_textbook`.

### `lessons`

Bài học thuộc một chương.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| chapter_id | UUID | NOT NULL | FK, composite UNIQUE | `chapters.id` |
| code | VARCHAR(20) | NOT NULL | composite UNIQUE | - |
| name | VARCHAR(500) | NOT NULL | - | - |
| page | INTEGER | NULL | - | - |
| sort_order | INTEGER | NOT NULL | - | - |
| knowledge_json | JSONB | NULL | - | - |

Indexes/constraints: `uq_lessons_chapter_code` unique (`chapter_id`, `code`), `idx_lessons_chapter`.

### `app_users`

Tài khoản người dùng được cấp quyền đăng nhập.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| email | VARCHAR(320) | NOT NULL | UNIQUE | - |
| google_sub | VARCHAR(255) | NULL | UNIQUE | - |
| full_name | VARCHAR(255) | NULL | - | - |
| subject | VARCHAR(20) | NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| last_login_at | TIMESTAMPTZ | NULL | - | - |
| avatar_url | VARCHAR(1024) | NULL | - | - |
| contact_info | VARCHAR(500) | NULL | - | - |
| bio | VARCHAR(1000) | NULL | - | - |
| phone_number | VARCHAR(30) | NULL | - | - |
| date_of_birth | DATE | NULL | - | - |

Indexes/constraints: unique on `email`, unique on `google_sub`.

### `refresh_tokens`

Refresh token đã hash của người dùng.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| user_id | UUID | NOT NULL | FK | `app_users.id` |
| token_hash | VARCHAR(64) | NOT NULL | UNIQUE | - |
| expires_at | TIMESTAMPTZ | NOT NULL | - | - |
| revoked | BOOLEAN | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: unique on `token_hash`, `idx_refresh_tokens_user`.

### `blog_posts`

Bài viết cộng đồng giáo viên.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| author_id | UUID | NOT NULL | FK | `app_users.id` |
| title | VARCHAR(255) | NOT NULL | - | - |
| content | TEXT | NOT NULL | - | - |
| subject | VARCHAR(20) | NOT NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| removed_reason | TEXT | NULL | - | - |
| removed_by | UUID | NULL | FK | `app_users.id` |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |
| thumbnail_url | VARCHAR(1000) | NULL | - | - |

Indexes/constraints: `idx_blog_posts_subject`, `idx_blog_posts_author`, `idx_blog_posts_status_created`.

### `blog_comments`

Bình luận và phản hồi bình luận trong blog.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| post_id | UUID | NOT NULL | FK | `blog_posts.id` |
| author_id | UUID | NOT NULL | FK | `app_users.id` |
| content | TEXT | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |
| hidden_at | TIMESTAMPTZ | NULL | - | - |
| hidden_by | UUID | NULL | FK | `app_users.id` |
| parent_comment_id | UUID | NULL | FK, self-reference | `blog_comments.id` |

Indexes/constraints: `idx_blog_comments_post`, `idx_blog_comments_visible_post`, `idx_blog_comments_parent`.

### `roles`

Danh mục vai trò RBAC.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| name | VARCHAR(20) | NOT NULL | UNIQUE | - |

Indexes/constraints: unique on `name`.

### `user_roles`

Bảng gán vai trò cho người dùng. Đây là junction table về mặt cấu trúc, nhưng `V6` áp `UNIQUE (user_id)` nên mỗi user chỉ có tối đa một role.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| user_id | UUID | NOT NULL | FK, UNIQUE, composite UNIQUE | `app_users.id` |
| role_id | UUID | NOT NULL | FK, composite UNIQUE | `roles.id` |
| granted_by | UUID | NULL | FK, self-reference via app_users | `app_users.id` |
| granted_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: unique (`user_id`, `role_id`), `uq_user_roles_user` unique (`user_id`), `idx_user_roles_user_id`, `idx_user_roles_role_id`.

### `textbook_names`

Catalog nhẹ cho dropdown tên sách.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| textbook_id | UUID | NOT NULL | FK, UNIQUE | `textbooks.id` |
| code | VARCHAR(20) | NOT NULL | UNIQUE | - |
| name | VARCHAR(200) | NOT NULL | - | - |
| grade | INTEGER | NOT NULL | - | - |
| subject_code | VARCHAR(40) | NOT NULL | - | - |
| subject_name | VARCHAR(100) | NOT NULL | - | - |
| volume | INTEGER | NULL | - | - |
| publisher | VARCHAR(200) | NULL | - | - |
| series | VARCHAR(200) | NULL | - | - |
| sort_order | INTEGER | NOT NULL | - | - |

Indexes/constraints: unique on `textbook_id`, unique on `code`, `idx_textbook_names_subject_grade`.

### `library_contents`

Thư viện nội dung cá nhân/hub: giáo án, slide, đề, mô phỏng...

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| owner_id | UUID | NOT NULL | FK | `app_users.id` |
| type | VARCHAR(20) | NOT NULL | - | - |
| title | VARCHAR(255) | NOT NULL | - | - |
| subject | VARCHAR(20) | NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| payload | JSONB | NOT NULL | - | - |
| thumbnail_url | TEXT | NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |
| deleted_at | TIMESTAMPTZ | NULL | - | - |
| grade | INTEGER | NULL | - | - |
| submitted_at | TIMESTAMPTZ | NULL | - | - |
| reviewed_by | UUID | NULL | FK | `app_users.id` |
| reviewed_at | TIMESTAMPTZ | NULL | - | - |
| rejection_reason | TEXT | NULL | - | - |
| textbook_code | VARCHAR(20) | NULL | Logical reference only | no physical FK |
| chapter_code | VARCHAR(20) | NULL | Logical reference only | no physical FK |

Indexes/constraints: partial indexes on owner/type/subject/grade/textbook+chapter, GIN title search, status+subject.

### `ai_system_prompts`

Cấu hình system prompt theo từng AI process.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| prompt_key | VARCHAR(40) | NOT NULL | PK | - |
| instruction | TEXT | NOT NULL | - | - |
| updated_by | UUID | NULL | FK | `app_users.id` |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |

### `classes`

Lớp học do giáo viên sở hữu.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| owner_id | UUID | NOT NULL | FK | `app_users.id` |
| name | VARCHAR(255) | NOT NULL | - | - |
| description | TEXT | NULL | - | - |
| subject | VARCHAR(20) | NOT NULL | - | - |
| grade | INTEGER | NOT NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: `idx_classes_owner_id`, `idx_classes_status`, `idx_classes_subject`.

### `class_members`

Thành viên học sinh trong lớp, có soft-remove.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| class_id | UUID | NOT NULL | FK, composite UNIQUE | `classes.id` |
| student_id | UUID | NOT NULL | FK, composite UNIQUE | `app_users.id` |
| joined_at | TIMESTAMPTZ | NOT NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| removed_at | TIMESTAMPTZ | NULL | - | - |
| removed_by | UUID | NULL | FK | `app_users.id` |
| removed_reason | VARCHAR(500) | NULL | - | - |
| rejoined_at | TIMESTAMPTZ | NULL | - | - |

Indexes/constraints: unique (`class_id`, `student_id`), `idx_class_members_class_id`, `idx_class_members_student_id`, `idx_class_members_class_status`, `idx_class_members_student_status`.

### `notifications`

Thông báo do người dùng gửi.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| sender_id | UUID | NOT NULL | FK | `app_users.id` |
| subject | VARCHAR(20) | NOT NULL | - | - |
| title | VARCHAR(200) | NOT NULL | - | - |
| content | VARCHAR(2000) | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| target_type | VARCHAR(50) | NULL | Logical target | no physical FK |
| target_url | VARCHAR(1000) | NULL | External/logical link | no physical FK |

Indexes/constraints: `idx_notifications_sender`.

### `notification_recipients`

Người nhận thông báo.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| notification_id | UUID | NOT NULL | FK, composite UNIQUE | `notifications.id` |
| recipient_id | UUID | NOT NULL | FK, composite UNIQUE | `app_users.id` |
| read_at | TIMESTAMPTZ | NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: unique (`notification_id`, `recipient_id`), `idx_notification_recipients_recipient`.

### `hub_content_comments`

Bình luận và phản hồi bình luận cho nội dung hub.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| library_content_id | UUID | NOT NULL | FK | `library_contents.id` |
| author_id | UUID | NOT NULL | FK | `app_users.id` |
| content | TEXT | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |
| parent_comment_id | UUID | NULL | FK, self-reference | `hub_content_comments.id` |
| hidden_at | TIMESTAMPTZ | NULL | - | - |
| hidden_by | UUID | NULL | FK | `app_users.id` |

Indexes/constraints: `idx_hub_content_comments_content`, `idx_hub_content_comments_parent`, `idx_hub_content_comments_visible_content`.

### `hub_content_reports`

Báo cáo vi phạm cho nội dung hub.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| library_content_id | UUID | NOT NULL | FK | `library_contents.id` |
| reporter_id | UUID | NOT NULL | FK | `app_users.id` |
| reason | TEXT | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: `idx_hub_content_reports_content`.

### `weekly_tasks`

Nhiệm vụ tuần do moderator giao cho teacher.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| moderator_id | UUID | NOT NULL | FK | `app_users.id` |
| subject | VARCHAR(20) | NOT NULL | - | - |
| teacher_id | UUID | NOT NULL | FK | `app_users.id` |
| week_start_date | DATE | NOT NULL | - | - |
| scope_description | TEXT | NOT NULL | - | - |
| deadline | TIMESTAMPTZ | NOT NULL | - | - |
| review_status | VARCHAR(20) | NOT NULL | - | - |
| source_library_content_id | UUID | NULL | FK | `library_contents.id` |
| source_document_url | TEXT | NULL | External/logical link | no physical FK |
| source_document_name | TEXT | NULL | - | - |
| submitted_at | TIMESTAMPTZ | NULL | - | - |
| reviewed_by | UUID | NULL | FK | `app_users.id` |
| reviewed_at | TIMESTAMPTZ | NULL | - | - |
| rejection_reason | TEXT | NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |
| source_library_content_title | VARCHAR(500) | NULL | Snapshot | - |
| source_library_content_payload | JSONB | NULL | Snapshot | - |
| version | BIGINT | NOT NULL | - | - |
| grade | INTEGER | NOT NULL | CHECK | - |
| textbook_code | VARCHAR(20) | NOT NULL | Logical reference only | no physical FK |
| chapter_code | VARCHAR(20) | NOT NULL | Logical reference only | no physical FK |
| chapter_name | VARCHAR(500) | NOT NULL | - | - |
| lesson_code | VARCHAR(20) | NOT NULL | Logical reference only | no physical FK |
| lesson_name | VARCHAR(500) | NOT NULL | - | - |

Indexes/constraints: `chk_weekly_task_submission_source`, `chk_weekly_task_rejection_reason`, `chk_weekly_tasks_grade`, `idx_weekly_tasks_teacher_week`, `idx_weekly_tasks_subject_week`, `idx_weekly_tasks_subject_status`, `idx_weekly_tasks_subject_grade_week`, `idx_weekly_tasks_subject_grade_week_lesson`.

### `activity_logs`

Audit log hành động trong hệ thống.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| actor_id | UUID | NOT NULL | FK | `app_users.id` |
| actor_role | VARCHAR(20) | NULL | - | - |
| category | VARCHAR(20) | NOT NULL | - | - |
| action | VARCHAR(40) | NOT NULL | - | - |
| target_type | VARCHAR(40) | NULL | Polymorphic/logical | no physical FK |
| target_id | UUID | NULL | Polymorphic/logical | no physical FK |
| metadata | VARCHAR(1000) | NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: `idx_activity_logs_actor`, `idx_activity_logs_category`, `idx_activity_logs_created_at`.

### `class_resources`

Tài nguyên/bài tập được đăng vào lớp.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| class_id | UUID | NOT NULL | FK | `classes.id` |
| posted_by | UUID | NOT NULL | FK | `app_users.id` |
| title | VARCHAR(255) | NOT NULL | - | - |
| description | TEXT | NULL | - | - |
| source_type | VARCHAR(20) | NOT NULL | - | - |
| source_library_content_id | UUID | NULL | FK | `library_contents.id` |
| thumbnail_url | TEXT | NULL | - | - |
| attachment_file_id | VARCHAR(255) | NULL | External storage id | no physical FK |
| attachment_url | TEXT | NULL | External storage URL | no physical FK |
| attachment_file_name | VARCHAR(255) | NULL | - | - |
| attachment_content_type | VARCHAR(100) | NULL | - | - |
| attachment_size_bytes | BIGINT | NULL | - | - |
| submission_enabled | BOOLEAN | NOT NULL | - | - |
| deadline | TIMESTAMPTZ | NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: `idx_class_resources_class_id`.

### `submissions`

Bài nộp của học sinh cho class resource.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| class_resource_id | UUID | NOT NULL | FK, composite UNIQUE | `class_resources.id` |
| student_id | UUID | NOT NULL | FK, composite UNIQUE | `app_users.id` |
| text_content | TEXT | NULL | - | - |
| status | VARCHAR(20) | NOT NULL | - | - |
| submitted_at | TIMESTAMPTZ | NOT NULL | - | - |
| created_at | TIMESTAMPTZ | NOT NULL | - | - |
| updated_at | TIMESTAMPTZ | NOT NULL | - | - |

Indexes/constraints: `uq_submissions_resource_student` unique (`class_resource_id`, `student_id`), `idx_submissions_resource_id`.

### `submission_files`

File đính kèm của một bài nộp.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| id | UUID | NOT NULL | PK | - |
| submission_id | UUID | NOT NULL | FK | `submissions.id` |
| url | TEXT | NOT NULL | External storage URL | no physical FK |
| file_name | VARCHAR(255) | NOT NULL | - | - |
| content_type | VARCHAR(100) | NOT NULL | - | - |
| size_bytes | BIGINT | NOT NULL | - | - |

Indexes/constraints: `idx_submission_files_submission_id`.

### `teacher_grades`

Khối lớp mà giáo viên phụ trách.

| Attribute | Data Type | Nullable | Key | References |
| --------- | --------- | -------- | --- | ---------- |
| user_id | UUID | NOT NULL | PK, FK | `app_users.id` |
| grade | INTEGER | NOT NULL | PK, CHECK | - |

Indexes/constraints: composite PK (`user_id`, `grade`), `chk_teacher_grades_grade`, `idx_teacher_grades_grade`.

## 2. Relationship

### `textbooks` - `chapters`

- FK: `chapters.textbook_id -> textbooks.id`
- Relationship: One-to-Many
- Cardinality: `textbooks 1 -- 0..N chapters`; `chapters 1 -- 1 textbooks`
- Ý nghĩa: một sách có nhiều chương; mỗi chương bắt buộc thuộc đúng một sách.
- Optionality: bắt buộc ở phía `chapters` vì FK `NOT NULL`; phía `textbooks` có thể không có chương theo constraint.

### `chapters` - `lessons`

- FK: `lessons.chapter_id -> chapters.id`
- Relationship: One-to-Many
- Cardinality: `chapters 1 -- 0..N lessons`; `lessons 1 -- 1 chapters`
- Ý nghĩa: một chương có nhiều bài; mỗi bài bắt buộc thuộc đúng một chương.
- Optionality: bắt buộc ở phía `lessons`.

### `app_users` - `refresh_tokens`

- FK: `refresh_tokens.user_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N refresh_tokens`; `refresh_tokens 1 -- 1 app_users`
- Ý nghĩa: một user có thể có nhiều refresh token.
- Optionality: bắt buộc ở phía `refresh_tokens`.

### `app_users` - `blog_posts` as author

- FK: `blog_posts.author_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N blog_posts`; `blog_posts 1 -- 1 app_users`
- Ý nghĩa: một user có thể viết nhiều bài blog.
- Optionality: bắt buộc ở phía `blog_posts`.

### `app_users` - `blog_posts` as remover

- FK: `blog_posts.removed_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N blog_posts`; `blog_posts 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể là người gỡ nhiều bài; bài có thể chưa bị gỡ.
- Optionality: optional ở phía `blog_posts.removed_by`.

### `blog_posts` - `blog_comments`

- FK: `blog_comments.post_id -> blog_posts.id`
- Relationship: One-to-Many
- Cardinality: `blog_posts 1 -- 0..N blog_comments`; `blog_comments 1 -- 1 blog_posts`
- Ý nghĩa: một bài blog có nhiều bình luận; bình luận bắt buộc thuộc một bài.
- Optionality: bắt buộc ở phía `blog_comments`.

### `app_users` - `blog_comments` as author

- FK: `blog_comments.author_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N blog_comments`; `blog_comments 1 -- 1 app_users`
- Ý nghĩa: một user có thể viết nhiều bình luận.
- Optionality: bắt buộc ở phía `blog_comments`.

### `app_users` - `blog_comments` as hider

- FK: `blog_comments.hidden_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N blog_comments`; `blog_comments 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể ẩn nhiều bình luận; bình luận có thể chưa bị ẩn.
- Optionality: optional ở phía `blog_comments.hidden_by`.

### `blog_comments` - `blog_comments`

- FK: `blog_comments.parent_comment_id -> blog_comments.id`
- Relationship: Self-reference One-to-Many
- Cardinality: `blog_comments(parent) 1 -- 0..N blog_comments(reply)`; `blog_comments(reply) 0..1 -- 1 blog_comments(parent)`
- Ý nghĩa: một bình luận có thể có nhiều phản hồi; một phản hồi có thể có một bình luận cha.
- Optionality: optional ở phía `parent_comment_id`.

### `app_users` - `user_roles` as assignee

- FK: `user_roles.user_id -> app_users.id`
- Relationship: One-to-One optional/effective, constrained by unique FK
- Cardinality: `app_users 1 -- 0..1 user_roles`; `user_roles 1 -- 1 app_users`
- Ý nghĩa: mỗi user có tối đa một role theo `UNIQUE (user_id)`.
- Optionality: optional ở phía `app_users` vì không có constraint buộc mọi user phải có row trong `user_roles`; bắt buộc ở phía `user_roles`.

### `roles` - `user_roles`

- FK: `user_roles.role_id -> roles.id`
- Relationship: One-to-Many
- Cardinality: `roles 1 -- 0..N user_roles`; `user_roles 1 -- 1 roles`
- Ý nghĩa: một role có thể gán cho nhiều user; mỗi row user_roles bắt buộc trỏ tới một role.
- Optionality: bắt buộc ở phía `user_roles`.

### `app_users` - `user_roles` as grantor

- FK: `user_roles.granted_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N user_roles`; `user_roles 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể cấp nhiều role; role assignment có thể không có người cấp, ví dụ seed.
- Optionality: optional ở phía `user_roles.granted_by`.

### `textbooks` - `textbook_names`

- FK: `textbook_names.textbook_id -> textbooks.id`
- Relationship: One-to-One optional from `textbooks` to `textbook_names`
- Cardinality: `textbooks 1 -- 0..1 textbook_names`; `textbook_names 1 -- 1 textbooks`
- Ý nghĩa: catalog nhẹ có tối đa một row cho mỗi textbook.
- Optionality: bắt buộc ở phía `textbook_names`; optional ở phía `textbooks` vì FK unique không buộc textbook phải có row catalog nhẹ.

### `app_users` - `library_contents` as owner

- FK: `library_contents.owner_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N library_contents`; `library_contents 1 -- 1 app_users`
- Ý nghĩa: một user sở hữu nhiều nội dung thư viện.
- Optionality: bắt buộc ở phía `library_contents`.

### `app_users` - `library_contents` as reviewer

- FK: `library_contents.reviewed_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N library_contents`; `library_contents 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể review nhiều nội dung; nội dung có thể chưa được review.
- Optionality: optional ở phía `library_contents.reviewed_by`.

### `app_users` - `ai_system_prompts`

- FK: `ai_system_prompts.updated_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N ai_system_prompts`; `ai_system_prompts 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể cập nhật nhiều prompt; prompt có thể chưa có người cập nhật.
- Optionality: optional ở phía `ai_system_prompts.updated_by`.

### `app_users` - `classes`

- FK: `classes.owner_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N classes`; `classes 1 -- 1 app_users`
- Ý nghĩa: một user có thể sở hữu nhiều lớp.
- Optionality: bắt buộc ở phía `classes`.

### `classes` - `class_members`

- FK: `class_members.class_id -> classes.id`
- Relationship: One-to-Many
- Cardinality: `classes 1 -- 0..N class_members`; `class_members 1 -- 1 classes`
- Ý nghĩa: một lớp có nhiều thành viên; mỗi membership bắt buộc thuộc một lớp.
- Optionality: bắt buộc ở phía `class_members`; `ON DELETE CASCADE`.

### `app_users` - `class_members` as student

- FK: `class_members.student_id -> app_users.id`
- Relationship: One-to-Many, unique together with class
- Cardinality: `app_users 1 -- 0..N class_members`; `class_members 1 -- 1 app_users`
- Ý nghĩa: một học sinh có thể tham gia nhiều lớp; trong cùng một lớp, mỗi học sinh chỉ có một membership row.
- Optionality: bắt buộc ở phía `class_members`.

### `app_users` - `class_members` as remover

- FK: `class_members.removed_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N class_members`; `class_members 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể xóa mềm nhiều membership; membership có thể chưa bị xóa.
- Optionality: optional ở phía `class_members.removed_by`.

### `app_users` - `notifications` as sender

- FK: `notifications.sender_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N notifications`; `notifications 1 -- 1 app_users`
- Ý nghĩa: một user có thể gửi nhiều thông báo.
- Optionality: bắt buộc ở phía `notifications`.

### `notifications` - `notification_recipients`

- FK: `notification_recipients.notification_id -> notifications.id`
- Relationship: One-to-Many
- Cardinality: `notifications 1 -- 0..N notification_recipients`; `notification_recipients 1 -- 1 notifications`
- Ý nghĩa: một thông báo có nhiều người nhận; mỗi recipient row thuộc một notification.
- Optionality: bắt buộc ở phía `notification_recipients`; `ON DELETE CASCADE`.

### `app_users` - `notification_recipients` as recipient

- FK: `notification_recipients.recipient_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N notification_recipients`; `notification_recipients 1 -- 1 app_users`
- Ý nghĩa: một user có thể nhận nhiều thông báo.
- Optionality: bắt buộc ở phía `notification_recipients`.

### `library_contents` - `hub_content_comments`

- FK: `hub_content_comments.library_content_id -> library_contents.id`
- Relationship: One-to-Many
- Cardinality: `library_contents 1 -- 0..N hub_content_comments`; `hub_content_comments 1 -- 1 library_contents`
- Ý nghĩa: một nội dung hub có nhiều bình luận.
- Optionality: bắt buộc ở phía `hub_content_comments`.

### `app_users` - `hub_content_comments` as author

- FK: `hub_content_comments.author_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N hub_content_comments`; `hub_content_comments 1 -- 1 app_users`
- Ý nghĩa: một user có thể bình luận nhiều lần trên hub.
- Optionality: bắt buộc ở phía `hub_content_comments`.

### `hub_content_comments` - `hub_content_comments`

- FK: `hub_content_comments.parent_comment_id -> hub_content_comments.id`
- Relationship: Self-reference One-to-Many
- Cardinality: `hub_content_comments(parent) 1 -- 0..N hub_content_comments(reply)`; `hub_content_comments(reply) 0..1 -- 1 hub_content_comments(parent)`
- Ý nghĩa: một bình luận hub có thể có nhiều phản hồi.
- Optionality: optional ở phía `parent_comment_id`; `ON DELETE CASCADE`.

### `app_users` - `hub_content_comments` as hider

- FK: `hub_content_comments.hidden_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N hub_content_comments`; `hub_content_comments 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể ẩn nhiều bình luận hub.
- Optionality: optional ở phía `hub_content_comments.hidden_by`.

### `library_contents` - `hub_content_reports`

- FK: `hub_content_reports.library_content_id -> library_contents.id`
- Relationship: One-to-Many
- Cardinality: `library_contents 1 -- 0..N hub_content_reports`; `hub_content_reports 1 -- 1 library_contents`
- Ý nghĩa: một nội dung hub có nhiều báo cáo vi phạm.
- Optionality: bắt buộc ở phía `hub_content_reports`.

### `app_users` - `hub_content_reports` as reporter

- FK: `hub_content_reports.reporter_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N hub_content_reports`; `hub_content_reports 1 -- 1 app_users`
- Ý nghĩa: một user có thể gửi nhiều báo cáo.
- Optionality: bắt buộc ở phía `hub_content_reports`.

### `app_users` - `weekly_tasks` as moderator

- FK: `weekly_tasks.moderator_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N weekly_tasks`; `weekly_tasks 1 -- 1 app_users`
- Ý nghĩa: một moderator có thể giao nhiều weekly task.
- Optionality: bắt buộc ở phía `weekly_tasks`.

### `app_users` - `weekly_tasks` as teacher

- FK: `weekly_tasks.teacher_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N weekly_tasks`; `weekly_tasks 1 -- 1 app_users`
- Ý nghĩa: một teacher có thể nhận nhiều weekly task.
- Optionality: bắt buộc ở phía `weekly_tasks`.

### `library_contents` - `weekly_tasks` as submitted source

- FK: `weekly_tasks.source_library_content_id -> library_contents.id`
- Relationship: One-to-Many optional
- Cardinality: `library_contents 1 -- 0..N weekly_tasks`; `weekly_tasks 0..1 -- 1 library_contents`
- Ý nghĩa: một weekly task có thể được nộp bằng nội dung thư viện; một nội dung có thể được dùng cho nhiều task.
- Optionality: optional ở phía `weekly_tasks.source_library_content_id`.

### `app_users` - `weekly_tasks` as reviewer

- FK: `weekly_tasks.reviewed_by -> app_users.id`
- Relationship: One-to-Many optional
- Cardinality: `app_users 1 -- 0..N weekly_tasks`; `weekly_tasks 0..1 -- 1 app_users`
- Ý nghĩa: một user có thể review nhiều weekly task; task có thể chưa được review.
- Optionality: optional ở phía `weekly_tasks.reviewed_by`.

### `app_users` - `activity_logs`

- FK: `activity_logs.actor_id -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N activity_logs`; `activity_logs 1 -- 1 app_users`
- Ý nghĩa: một user tạo ra nhiều dòng audit log.
- Optionality: bắt buộc ở phía `activity_logs`.

### `classes` - `class_resources`

- FK: `class_resources.class_id -> classes.id`
- Relationship: One-to-Many
- Cardinality: `classes 1 -- 0..N class_resources`; `class_resources 1 -- 1 classes`
- Ý nghĩa: một lớp có nhiều tài nguyên/bài tập.
- Optionality: bắt buộc ở phía `class_resources`; `ON DELETE CASCADE`.

### `app_users` - `class_resources` as poster

- FK: `class_resources.posted_by -> app_users.id`
- Relationship: One-to-Many
- Cardinality: `app_users 1 -- 0..N class_resources`; `class_resources 1 -- 1 app_users`
- Ý nghĩa: một user có thể đăng nhiều tài nguyên lớp.
- Optionality: bắt buộc ở phía `class_resources`.

### `library_contents` - `class_resources` as source

- FK: `class_resources.source_library_content_id -> library_contents.id`
- Relationship: One-to-Many optional
- Cardinality: `library_contents 1 -- 0..N class_resources`; `class_resources 0..1 -- 1 library_contents`
- Ý nghĩa: class resource có thể lấy nguồn từ một library content.
- Optionality: optional ở phía `class_resources.source_library_content_id`.

### `class_resources` - `submissions`

- FK: `submissions.class_resource_id -> class_resources.id`
- Relationship: One-to-Many, unique together with student
- Cardinality: `class_resources 1 -- 0..N submissions`; `submissions 1 -- 1 class_resources`
- Ý nghĩa: một class resource có nhiều bài nộp; mỗi học sinh chỉ có tối đa một bài nộp cho một resource nhờ unique (`class_resource_id`, `student_id`).
- Optionality: bắt buộc ở phía `submissions`; `ON DELETE CASCADE`.

### `app_users` - `submissions` as student

- FK: `submissions.student_id -> app_users.id`
- Relationship: One-to-Many, unique together with class resource
- Cardinality: `app_users 1 -- 0..N submissions`; `submissions 1 -- 1 app_users`
- Ý nghĩa: một học sinh có thể có nhiều bài nộp ở nhiều class resource.
- Optionality: bắt buộc ở phía `submissions`.

### `submissions` - `submission_files`

- FK: `submission_files.submission_id -> submissions.id`
- Relationship: One-to-Many
- Cardinality: `submissions 1 -- 0..N submission_files`; `submission_files 1 -- 1 submissions`
- Ý nghĩa: một bài nộp có thể có nhiều file đính kèm.
- Optionality: bắt buộc ở phía `submission_files`; `ON DELETE CASCADE`.

### `app_users` - `teacher_grades`

- FK: `teacher_grades.user_id -> app_users.id`
- Relationship: One-to-Many from user to grade rows; composite key table
- Cardinality: `app_users 1 -- 0..N teacher_grades`; `teacher_grades 1 -- 1 app_users`
- Ý nghĩa: một teacher có thể phụ trách nhiều khối; mỗi row gắn một user với một grade.
- Optionality: bắt buộc ở phía `teacher_grades`; `ON DELETE CASCADE`.

## 3. Relationship Đặc Biệt

- Junction table / N:N:
  - `user_roles`: cấu trúc junction giữa `app_users` và `roles`, nhưng do `UNIQUE (user_id)` nên quan hệ thực tế theo constraint là mỗi user tối đa một role, không còn N:N đầy đủ.
  - `class_members`: bảng trung gian giữa `classes` và `app_users` theo vai trò student. Unique (`class_id`, `student_id`) cho phép lớp có nhiều học sinh và học sinh thuộc nhiều lớp, tức N:N được hiện thực bằng entity membership có thuộc tính riêng.
  - `notification_recipients`: bảng trung gian giữa `notifications` và `app_users` theo vai trò recipient. Unique (`notification_id`, `recipient_id`) cho phép một thông báo gửi nhiều user và một user nhận nhiều thông báo.
  - `teacher_grades`: bảng ghép `app_users` với giá trị grade, không trỏ tới bảng `grades` vì grade là scalar có CHECK.
- Self-reference:
  - `blog_comments.parent_comment_id -> blog_comments.id`.
  - `hub_content_comments.parent_comment_id -> hub_content_comments.id`.
  - `user_roles.granted_by -> app_users.id`, `class_members.removed_by -> app_users.id`, và các FK reviewer/actor/moderator đều trỏ lại cùng entity `app_users` theo vai trò khác nhau.
- Composite Key:
  - `teacher_grades` có composite PK (`user_id`, `grade`).
- Composite Unique:
  - `chapters` unique (`textbook_id`, `code`).
  - `lessons` unique (`chapter_id`, `code`).
  - `user_roles` unique (`user_id`, `role_id`) và unique (`user_id`).
  - `class_members` unique (`class_id`, `student_id`).
  - `notification_recipients` unique (`notification_id`, `recipient_id`).
  - `submissions` unique (`class_resource_id`, `student_id`).
- FK có Unique tạo 1:1:
  - `textbook_names.textbook_id` là FK `NOT NULL UNIQUE` tới `textbooks.id`: `textbooks 1 -- 0..1 textbook_names`.
  - `user_roles.user_id` là FK `NOT NULL UNIQUE` tới `app_users.id`: `app_users 1 -- 0..1 user_roles`.
- Quan hệ tồn tại trong ORM/code nhưng không có FK vật lý:
  - `weekly_tasks.textbook_code/chapter_code/lesson_code` liên hệ logic tới catalog SGK, nhưng không có FK tới `textbooks`, `chapters`, hoặc `lessons`.
  - `library_contents.textbook_code/chapter_code` liên hệ logic tới catalog SGK, nhưng không có FK vật lý.
  - `activity_logs.target_type/target_id` là polymorphic/logical target, không có FK vật lý.
  - `notifications.target_type/target_url` là target điều hướng logic, không có FK vật lý.
  - Các entity JPA phần lớn dùng UUID scalar thay vì `@ManyToOne`; quan hệ vẫn tồn tại vật lý nếu migration có FK.
- Polymorphic relationship:
  - `activity_logs.target_type + target_id`: polymorphic/logical, cần xác minh mapping target cụ thể trong service nếu muốn vẽ đường nối nghiệp vụ.
  - `notifications.target_type + target_url`: logical target, không đủ căn cứ để nối với table cụ thể.

## 4. ERD Drawing Specification

### Entities

```text
textbooks
----------------------
PK id
UQ code
   name
   grade
   source
   publisher
   series
```

```text
chapters
----------------------
PK id
FK textbook_id -> textbooks.id
UQ textbook_id + code
   code
   name
   sort_order
```

```text
lessons
----------------------
PK id
FK chapter_id -> chapters.id
UQ chapter_id + code
   code
   name
   page
   sort_order
   knowledge_json
```

```text
app_users
----------------------
PK id
UQ email
UQ google_sub
   full_name
   subject
   status
   created_at
   last_login_at
   avatar_url
   contact_info
   bio
   phone_number
   date_of_birth
```

```text
refresh_tokens
----------------------
PK id
FK user_id -> app_users.id
UQ token_hash
   expires_at
   revoked
   created_at
```

```text
blog_posts
----------------------
PK id
FK author_id -> app_users.id
FK removed_by -> app_users.id
   title
   content
   subject
   status
   removed_reason
   created_at
   updated_at
   thumbnail_url
```

```text
blog_comments
----------------------
PK id
FK post_id -> blog_posts.id
FK author_id -> app_users.id
FK hidden_by -> app_users.id
FK parent_comment_id -> blog_comments.id
   content
   created_at
   updated_at
   hidden_at
```

```text
roles
----------------------
PK id
UQ name
```

```text
user_roles
----------------------
PK id
FK user_id -> app_users.id
FK role_id -> roles.id
FK granted_by -> app_users.id
UQ user_id
UQ user_id + role_id
   granted_at
```

```text
textbook_names
----------------------
PK id
FK textbook_id -> textbooks.id
UQ textbook_id
UQ code
   name
   grade
   subject_code
   subject_name
   volume
   publisher
   series
   sort_order
```

```text
library_contents
----------------------
PK id
FK owner_id -> app_users.id
FK reviewed_by -> app_users.id
   type
   title
   subject
   status
   payload
   thumbnail_url
   created_at
   updated_at
   deleted_at
   grade
   submitted_at
   reviewed_at
   rejection_reason
   textbook_code
   chapter_code
```

```text
ai_system_prompts
----------------------
PK prompt_key
FK updated_by -> app_users.id
   instruction
   updated_at
```

```text
classes
----------------------
PK id
FK owner_id -> app_users.id
   name
   description
   subject
   grade
   status
   created_at
   updated_at
```

```text
class_members
----------------------
PK id
FK class_id -> classes.id
FK student_id -> app_users.id
FK removed_by -> app_users.id
UQ class_id + student_id
   joined_at
   status
   removed_at
   removed_reason
   rejoined_at
```

```text
notifications
----------------------
PK id
FK sender_id -> app_users.id
   subject
   title
   content
   created_at
   target_type
   target_url
```

```text
notification_recipients
----------------------
PK id
FK notification_id -> notifications.id
FK recipient_id -> app_users.id
UQ notification_id + recipient_id
   read_at
   created_at
```

```text
hub_content_comments
----------------------
PK id
FK library_content_id -> library_contents.id
FK author_id -> app_users.id
FK parent_comment_id -> hub_content_comments.id
FK hidden_by -> app_users.id
   content
   created_at
   updated_at
   hidden_at
```

```text
hub_content_reports
----------------------
PK id
FK library_content_id -> library_contents.id
FK reporter_id -> app_users.id
   reason
   created_at
```

```text
weekly_tasks
----------------------
PK id
FK moderator_id -> app_users.id
FK teacher_id -> app_users.id
FK source_library_content_id -> library_contents.id
FK reviewed_by -> app_users.id
   subject
   grade
   week_start_date
   scope_description
   textbook_code
   chapter_code
   chapter_name
   lesson_code
   lesson_name
   deadline
   review_status
   source_library_content_title
   source_library_content_payload
   source_document_url
   source_document_name
   submitted_at
   reviewed_at
   rejection_reason
   created_at
   updated_at
   version
```

```text
activity_logs
----------------------
PK id
FK actor_id -> app_users.id
   actor_role
   category
   action
   target_type
   target_id
   metadata
   created_at
```

```text
class_resources
----------------------
PK id
FK class_id -> classes.id
FK posted_by -> app_users.id
FK source_library_content_id -> library_contents.id
   title
   description
   source_type
   thumbnail_url
   attachment_file_id
   attachment_url
   attachment_file_name
   attachment_content_type
   attachment_size_bytes
   submission_enabled
   deadline
   created_at
   updated_at
```

```text
submissions
----------------------
PK id
FK class_resource_id -> class_resources.id
FK student_id -> app_users.id
UQ class_resource_id + student_id
   text_content
   status
   submitted_at
   created_at
   updated_at
```

```text
submission_files
----------------------
PK id
FK submission_id -> submissions.id
   url
   file_name
   content_type
   size_bytes
```

```text
teacher_grades
----------------------
PK user_id + grade
FK user_id -> app_users.id
   grade
```

### Lines To Draw

```text
textbooks.id 1 -------- 0..N chapters.textbook_id
chapters.id 1 -------- 0..N lessons.chapter_id
app_users.id 1 -------- 0..N refresh_tokens.user_id
app_users.id 1 -------- 0..N blog_posts.author_id
app_users.id 1 -------- 0..N blog_posts.removed_by
blog_posts.id 1 -------- 0..N blog_comments.post_id
app_users.id 1 -------- 0..N blog_comments.author_id
app_users.id 1 -------- 0..N blog_comments.hidden_by
blog_comments.id 1 -------- 0..N blog_comments.parent_comment_id
app_users.id 1 -------- 0..1 user_roles.user_id
roles.id 1 -------- 0..N user_roles.role_id
app_users.id 1 -------- 0..N user_roles.granted_by
textbooks.id 1 -------- 0..1 textbook_names.textbook_id
app_users.id 1 -------- 0..N library_contents.owner_id
app_users.id 1 -------- 0..N library_contents.reviewed_by
app_users.id 1 -------- 0..N ai_system_prompts.updated_by
app_users.id 1 -------- 0..N classes.owner_id
classes.id 1 -------- 0..N class_members.class_id
app_users.id 1 -------- 0..N class_members.student_id
app_users.id 1 -------- 0..N class_members.removed_by
app_users.id 1 -------- 0..N notifications.sender_id
notifications.id 1 -------- 0..N notification_recipients.notification_id
app_users.id 1 -------- 0..N notification_recipients.recipient_id
library_contents.id 1 -------- 0..N hub_content_comments.library_content_id
app_users.id 1 -------- 0..N hub_content_comments.author_id
hub_content_comments.id 1 -------- 0..N hub_content_comments.parent_comment_id
app_users.id 1 -------- 0..N hub_content_comments.hidden_by
library_contents.id 1 -------- 0..N hub_content_reports.library_content_id
app_users.id 1 -------- 0..N hub_content_reports.reporter_id
app_users.id 1 -------- 0..N weekly_tasks.moderator_id
app_users.id 1 -------- 0..N weekly_tasks.teacher_id
library_contents.id 1 -------- 0..N weekly_tasks.source_library_content_id
app_users.id 1 -------- 0..N weekly_tasks.reviewed_by
app_users.id 1 -------- 0..N activity_logs.actor_id
classes.id 1 -------- 0..N class_resources.class_id
app_users.id 1 -------- 0..N class_resources.posted_by
library_contents.id 1 -------- 0..N class_resources.source_library_content_id
class_resources.id 1 -------- 0..N submissions.class_resource_id
app_users.id 1 -------- 0..N submissions.student_id
submissions.id 1 -------- 0..N submission_files.submission_id
app_users.id 1 -------- 0..N teacher_grades.user_id
```

Optional FK notes for drawing:

- Các line tới `removed_by`, `hidden_by`, `reviewed_by`, `updated_by`, `granted_by`, `source_library_content_id`, `parent_comment_id` là optional ở phía FK vì column nullable.
- Các line có FK `NOT NULL` là bắt buộc ở phía bảng con.
- Không vẽ line vật lý cho `activity_logs.target_id`, `notifications.target_url`, `weekly_tasks.textbook_code/chapter_code/lesson_code`, hoặc `library_contents.textbook_code/chapter_code` nếu ERD chỉ biểu diễn FK thực tế.
