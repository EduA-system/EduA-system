ALTER TABLE weekly_tasks
    ADD COLUMN source_library_content_title VARCHAR(500),
    ADD COLUMN source_library_content_payload JSONB,
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_weekly_task_submission_source CHECK (
        NOT (source_library_content_id IS NOT NULL AND source_document_url IS NOT NULL)
    ),
    ADD CONSTRAINT chk_weekly_task_rejection_reason CHECK (
        review_status <> 'REJECTED' OR rejection_reason IS NOT NULL
    );
