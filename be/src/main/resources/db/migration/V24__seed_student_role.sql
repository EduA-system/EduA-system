-- Add Student (UC-36) can gan Role.STUDENT cho tai khoan hoc sinh de dang nhap duoc
-- (JwtTokenAdapter.issueAccessToken throw neu user khong co role nao).
INSERT INTO roles (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000005', 'STUDENT')
ON CONFLICT (name) DO NOTHING;
