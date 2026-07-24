-- RBAC chuẩn: roles (bảng riêng) + user_roles (junction).
-- user_roles chứa granted_by/granted_at thay vì trên app_users.

CREATE TABLE roles (
    id   UUID        PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO roles (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'TEACHER'),
  ('a0000000-0000-0000-0000-000000000002', 'MODERATOR'),
  ('a0000000-0000-0000-0000-000000000003', 'PRINCIPAL');

CREATE TABLE user_roles (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES app_users (id),
    role_id    UUID        NOT NULL REFERENCES roles (id),
    granted_by UUID        REFERENCES app_users (id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_id)
);

INSERT INTO user_roles (id, user_id, role_id, granted_by, granted_at)
SELECT gen_random_uuid(), u.id, r.id, u.granted_by, COALESCE(u.granted_at, u.created_at)
FROM app_users u
JOIN roles r ON r.name = CASE
    WHEN u.role = 'ADMINISTRATOR' THEN 'PRINCIPAL'
    ELSE u.role
END;

ALTER TABLE app_users
  DROP COLUMN role,
  DROP COLUMN granted_by,
  DROP COLUMN granted_at;

CREATE INDEX idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);
