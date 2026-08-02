-- Auth: người dùng (allowlist do Principal/Moderator cấp) + refresh token.
-- Không lưu mật khẩu (SEC-01). Một dòng app_users tồn tại = email đã được cấp quyền.
-- Principal đầu tiên được seed bằng PrincipalSeedRunner (đọc app.auth.principal-seed-email), không hardcode ở đây.

CREATE TABLE app_users (
    id            UUID         PRIMARY KEY,
    email         VARCHAR(320) NOT NULL UNIQUE,
    google_sub    VARCHAR(255) UNIQUE,
    full_name     VARCHAR(255),
    role          VARCHAR(20)  NOT NULL,                 -- TEACHER | MODERATOR | PRINCIPAL
    subject       VARCHAR(20),                           -- MATH | CHEMISTRY | PHYSICS (chỉ Teacher)
    status        VARCHAR(20)  NOT NULL DEFAULT 'INVITED',-- INVITED | ACTIVE | DISABLED
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE refresh_tokens (
    id         UUID         PRIMARY KEY,
    user_id    UUID         NOT NULL REFERENCES app_users (id),
    token_hash VARCHAR(64)  NOT NULL UNIQUE,             -- SHA-256 hex của refresh token
    expires_at TIMESTAMPTZ  NOT NULL,
    revoked    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
