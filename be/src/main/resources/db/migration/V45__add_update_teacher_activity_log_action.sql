-- fix/fix-R thêm ActivityLogAction.UPDATE_TEACHER (Moderator sửa thông tin giáo viên),
-- nhưng nhánh đó fork trước V44 nên không thấy constraint activity_logs_action_check.
-- Sau khi cherry-pick vào main, mọi lần Moderator sửa giáo viên sẽ vi phạm check
-- constraint (500) — đúng lỗi mà V44 đã sửa cho REPLACE_IT_STAFF.
-- Tạo lại constraint khớp đủ enum ActivityLogAction hiện tại.

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;

ALTER TABLE activity_logs
    ADD CONSTRAINT activity_logs_action_check
    CHECK (action IN (
        'LOGIN',
        'LOGOUT',
        'GRANT_MODERATOR',
        'REPLACE_MODERATOR',
        'REACTIVATE_MODERATOR',
        'GRANT_IT_STAFF',
        'REPLACE_IT_STAFF',
        'REVOKE_IT_STAFF',
        'REACTIVATE_IT_STAFF',
        'GRANT_TEACHER',
        'UPDATE_TEACHER',
        'REVOKE_TEACHER',
        'REACTIVATE_TEACHER',
        'APPROVE_LIBRARY_CONTENT',
        'REJECT_LIBRARY_CONTENT',
        'REMOVE_BLOG_POST',
        'APPROVE_WEEKLY_TASK',
        'REJECT_WEEKLY_TASK',
        'UPDATE_SYSTEM_PROMPT'
    ));
