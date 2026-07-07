-- Account Management: thêm cột audit cho luồng cấp quyền phân cấp (Admin → Moderator → Teacher).
-- granted_by = UUID của người cấp quyền (REFERENCES app_users), NULL nếu tự seed (admin đầu tiên).
-- granted_at = thời điểm cấp quyền.
ALTER TABLE app_users
  ADD COLUMN granted_by UUID REFERENCES app_users (id),
  ADD COLUMN granted_at TIMESTAMPTZ;

-- Gán granted_at cho các dòng đã tồn tại (seed runner cũ không có giá trị này).
UPDATE app_users SET granted_at = created_at WHERE granted_at IS NULL;
