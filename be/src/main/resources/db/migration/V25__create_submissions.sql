-- Bang nay phuc vu UC-47 (Submit Assignment)/UC-48 (Unsubmit Assignment). Ho tro ca text
-- (rich text HTML, sanitize bang BlogContentSanitizer) lan file (1-nhieu, bang con
-- submission_files) - mo rong ngoai SRS goc (chi mo ta nop bang file). Xem thiet ke:
-- designs/API_designs/submit-assignment.md, designs/submit-assignment/flow.md.

CREATE TABLE submissions (
    id                  UUID         PRIMARY KEY,
    class_resource_id   UUID         NOT NULL REFERENCES class_resources (id) ON DELETE CASCADE,
    student_id          UUID         NOT NULL REFERENCES app_users (id),
    text_content        TEXT,
    status              VARCHAR(20)  NOT NULL,
    submitted_at        TIMESTAMPTZ  NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_submissions_resource_student UNIQUE (class_resource_id, student_id)
);

CREATE INDEX idx_submissions_resource_id ON submissions (class_resource_id);

CREATE TABLE submission_files (
    id              UUID          PRIMARY KEY,
    submission_id   UUID          NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    url             TEXT          NOT NULL,
    file_name       VARCHAR(255)  NOT NULL,
    content_type    VARCHAR(100)  NOT NULL,
    size_bytes      BIGINT        NOT NULL
);

CREATE INDEX idx_submission_files_submission_id ON submission_files (submission_id);
