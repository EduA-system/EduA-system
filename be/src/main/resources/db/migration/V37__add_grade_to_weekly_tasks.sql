-- BR-51 (designs/weekly-task/grade-scoped-deadline-and-review.md): mỗi Weekly Task thuộc đúng 1 khối.
-- Đã xác nhận với người yêu cầu (2026-08-06): các dòng weekly_tasks hiện có trên môi trường chạy migration
-- này là dữ liệu test, không cần giữ — xóa thẳng thay vì backfill một giá trị khối không chắc đúng.
ALTER TABLE weekly_tasks
    ADD COLUMN IF NOT EXISTS grade INTEGER;

DELETE FROM weekly_tasks WHERE grade IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_weekly_tasks_grade'
          AND conrelid = 'weekly_tasks'::regclass
    ) THEN
        ALTER TABLE weekly_tasks
            ADD CONSTRAINT chk_weekly_tasks_grade CHECK (grade IN (10, 11, 12));
    END IF;
END $$;

ALTER TABLE weekly_tasks
    ALTER COLUMN grade SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_subject_grade_week
    ON weekly_tasks (subject, grade, week_start_date);
