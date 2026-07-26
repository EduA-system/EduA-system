-- Activity Log: records discrete actions (auth, account changes, moderation decisions,
-- system-prompt config changes) for IT Staff to review/filter (SRS UC-11).

CREATE TABLE activity_logs (
    id          UUID        PRIMARY KEY,
    actor_id    UUID        NOT NULL REFERENCES app_users (id),
    actor_role  VARCHAR(20),
    category    VARCHAR(20) NOT NULL,
    action      VARCHAR(40) NOT NULL,
    target_type VARCHAR(40),
    target_id   UUID,
    metadata    VARCHAR(1000),
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_activity_logs_actor ON activity_logs (actor_id, created_at DESC);
CREATE INDEX idx_activity_logs_category ON activity_logs (category, created_at DESC);
CREATE INDEX idx_activity_logs_created_at ON activity_logs (created_at DESC);
