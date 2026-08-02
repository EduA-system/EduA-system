-- Community Hub: bình luận + báo cáo vi phạm trên library_contents đã APPROVED.

CREATE TABLE hub_content_comments (
    id                 UUID        PRIMARY KEY,
    library_content_id UUID        NOT NULL REFERENCES library_contents (id),
    author_id          UUID        NOT NULL REFERENCES app_users (id),
    content            TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_content_comments_content ON hub_content_comments (library_content_id);

CREATE TABLE hub_content_reports (
    id                 UUID        PRIMARY KEY,
    library_content_id UUID        NOT NULL REFERENCES library_contents (id),
    reporter_id        UUID        NOT NULL REFERENCES app_users (id),
    reason             TEXT        NOT NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_content_reports_content ON hub_content_reports (library_content_id);
