ALTER TABLE class_members
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS removed_by UUID NULL REFERENCES app_users (id),
    ADD COLUMN IF NOT EXISTS removed_reason VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS rejoined_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_class_members_class_status ON class_members (class_id, status);
CREATE INDEX IF NOT EXISTS idx_class_members_student_status ON class_members (student_id, status);
