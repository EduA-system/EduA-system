-- Gắn Weekly Task với 1 Chương + 1 Bài cụ thể trong SGK (thay cho việc chỉ mô tả tự do trong
-- scope_description). scope_description giữ nguyên vai trò "Tiêu đề" (Mod tự nhập) — không đổi tên/kiểu.
-- Đã xác nhận với người yêu cầu (2026-08-06, cùng đợt với V37): weekly_tasks trên môi trường chạy migration
-- này chỉ có dữ liệu test — xóa thẳng các dòng chưa có textbook_code thay vì backfill.
ALTER TABLE weekly_tasks
    ADD COLUMN IF NOT EXISTS textbook_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS chapter_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS chapter_name VARCHAR(500),
    ADD COLUMN IF NOT EXISTS lesson_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS lesson_name VARCHAR(500);

DELETE FROM weekly_tasks WHERE textbook_code IS NULL;

ALTER TABLE weekly_tasks
    ALTER COLUMN textbook_code SET NOT NULL,
    ALTER COLUMN chapter_code SET NOT NULL,
    ALTER COLUMN chapter_name SET NOT NULL,
    ALTER COLUMN lesson_code SET NOT NULL,
    ALTER COLUMN lesson_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_weekly_tasks_subject_grade_week_lesson
    ON weekly_tasks (subject, grade, week_start_date, lesson_code);
