-- Weekly Task: Moderator giao yêu cầu giáo án cho 1 Teacher cùng subject, kèm hạn nộp.
-- "review_status" (Weekly Task) độc lập hoàn toàn với "status" (Publish/Hub) trên library_contents.

CREATE TABLE weekly_tasks (
    id                         UUID        PRIMARY KEY,
    moderator_id               UUID        NOT NULL REFERENCES app_users (id),
    subject                    VARCHAR(20) NOT NULL,
    teacher_id                 UUID        NOT NULL REFERENCES app_users (id),
    week_start_date            DATE        NOT NULL,
    scope_description          TEXT        NOT NULL,
    deadline                   TIMESTAMPTZ NOT NULL,
    review_status               VARCHAR(20) NOT NULL DEFAULT 'NOT_SUBMITTED',
    source_library_content_id  UUID        REFERENCES library_contents (id),
    source_document_url        TEXT,
    source_document_name       TEXT,
    submitted_at               TIMESTAMPTZ,
    reviewed_by                UUID        REFERENCES app_users (id),
    reviewed_at                TIMESTAMPTZ,
    rejection_reason           TEXT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_weekly_tasks_teacher_week ON weekly_tasks (teacher_id, week_start_date);
CREATE INDEX idx_weekly_tasks_subject_week ON weekly_tasks (subject, week_start_date);
CREATE INDEX idx_weekly_tasks_subject_status ON weekly_tasks (subject, review_status);
