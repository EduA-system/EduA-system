-- Moderator quản lý toàn bộ khối 10, 11, 12 của môn mình phụ trách.
-- Backfill cho tài khoản Moderator đã tồn tại trước khi quy tắc này được áp dụng.
-- Kept at V48 because V47 is already allocated to library hub snapshots.
INSERT INTO teacher_grades (user_id, grade)
SELECT ur.user_id, grade_values.grade
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
CROSS JOIN (VALUES (10), (11), (12)) AS grade_values(grade)
WHERE r.name = 'MODERATOR'
ON CONFLICT (user_id, grade) DO NOTHING;
