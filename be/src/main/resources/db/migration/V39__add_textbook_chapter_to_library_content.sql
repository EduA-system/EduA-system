-- Gắn giáo án trong thư viện với (Sách - Chương) đã dùng để soạn, phục vụ popup
-- "Chọn giáo án để nộp" (/weekly-schedule): chỉ hiện giáo án thuộc đúng Chương Mod đã giao,
-- thay vì liệt kê toàn bộ thư viện cá nhân. Nullable — không phải mọi content (SLIDE_DECK, TEST,
-- SIMULATION, hoặc LESSON_PLAN soạn ngoài luồng sinh từ SGK) đều gắn với 1 chương cụ thể.
ALTER TABLE library_contents
    ADD COLUMN IF NOT EXISTS textbook_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS chapter_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_library_contents_owner_textbook_chapter
    ON library_contents (owner_id, textbook_code, chapter_code);

-- Backfill cho giáo án cũ: nếu 1 content đã từng được dùng để nộp một weekly task, ta biết
-- chắc chắn Sách/Chương của nó ngay trong chính task đó — khỏi bắt giáo viên mở lại và lưu
-- lại để tính năng lọc theo chương nhận ra.
UPDATE library_contents lc
SET textbook_code = wt.textbook_code,
    chapter_code = wt.chapter_code
FROM weekly_tasks wt
WHERE wt.source_library_content_id = lc.id
  AND lc.textbook_code IS NULL;
