-- Blog cộng đồng giáo viên: bài viết + bình luận.
-- Đăng trực tiếp không duyệt (BR-20); mỗi bài gắn 1 subject (search/filter + ranh giới kiểm duyệt).
-- Soft-delete + audit: status phân biệt gỡ bởi Moderator (kèm lý do) vs xóa bởi tác giả.

CREATE TABLE blog_posts (
    id             UUID         PRIMARY KEY,
    author_id      UUID         NOT NULL REFERENCES app_users (id),
    title          VARCHAR(255) NOT NULL,
    content        TEXT         NOT NULL,                      -- HTML đã sanitize (Jsoup)
    subject        VARCHAR(20)  NOT NULL,                      -- MATH | CHEMISTRY | PHYSICS
    status         VARCHAR(20)  NOT NULL DEFAULT 'PUBLISHED',  -- PUBLISHED | REMOVED_BY_MODERATOR | DELETED_BY_AUTHOR
    removed_reason TEXT,                                       -- lý do khi Moderator gỡ (BR-21)
    removed_by     UUID         REFERENCES app_users (id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_subject        ON blog_posts (subject);
CREATE INDEX idx_blog_posts_author         ON blog_posts (author_id);
CREATE INDEX idx_blog_posts_status_created ON blog_posts (status, created_at DESC);

CREATE TABLE blog_comments (
    id         UUID        PRIMARY KEY,
    post_id    UUID        NOT NULL REFERENCES blog_posts (id),
    author_id  UUID        NOT NULL REFERENCES app_users (id),
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_comments_post ON blog_comments (post_id);
