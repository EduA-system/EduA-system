-- This migration must tolerate databases where a previous local schema update
-- already introduced one or more of these columns.
ALTER TABLE weekly_tasks
    ADD COLUMN IF NOT EXISTS source_library_content_title VARCHAR(500),
    ADD COLUMN IF NOT EXISTS source_library_content_payload JSONB,
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_weekly_task_submission_source'
          AND conrelid = 'weekly_tasks'::regclass
    ) THEN
        ALTER TABLE weekly_tasks
            ADD CONSTRAINT chk_weekly_task_submission_source CHECK (
                NOT (source_library_content_id IS NOT NULL AND source_document_url IS NOT NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_weekly_task_rejection_reason'
          AND conrelid = 'weekly_tasks'::regclass
    ) THEN
        ALTER TABLE weekly_tasks
            ADD CONSTRAINT chk_weekly_task_rejection_reason CHECK (
                review_status <> 'REJECTED' OR rejection_reason IS NOT NULL
            );
    END IF;
END $$;
