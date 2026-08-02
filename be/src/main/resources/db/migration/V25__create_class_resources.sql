-- Bang nay phuc vu UC-41 (Student xem danh sach class resource). Viec GHI du lieu
-- (UC-38 Post / UC-39 Update / UC-40 Delete Class Resource) se co migration/service bo sung
-- rieng khi cac use case do duoc thiet ke; o day chi tao schema toi thieu de endpoint doc
-- (GET /api/classes/{id}/resources) co nguon du lieu that. Xem thiet ke:
-- designs/API_designs/view-class-resources.md, designs/view-class-resources/flow.md.

CREATE TABLE class_resources (
    id                          UUID         PRIMARY KEY,
    class_id                    UUID         NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    posted_by                   UUID         NOT NULL REFERENCES app_users (id),
    title                       VARCHAR(255) NOT NULL,
    description                 TEXT,
    source_type                 VARCHAR(20)  NOT NULL,
    source_library_content_id   UUID         REFERENCES library_contents (id),
    thumbnail_url                TEXT,
    attachment_file_id          VARCHAR(255),
    attachment_url               TEXT,
    attachment_file_name         VARCHAR(255),
    attachment_content_type      VARCHAR(100),
    attachment_size_bytes        BIGINT,
    submission_enabled          BOOLEAN      NOT NULL DEFAULT false,
    deadline                    TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_class_resources_class_id ON class_resources (class_id);
