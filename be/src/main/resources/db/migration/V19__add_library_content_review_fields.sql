ALTER TABLE library_contents ADD COLUMN reviewed_by UUID REFERENCES app_users(id);
ALTER TABLE library_contents ADD COLUMN reviewed_at TIMESTAMPTZ;
ALTER TABLE library_contents ADD COLUMN rejection_reason TEXT;

CREATE INDEX idx_library_contents_status_subject ON library_contents (status, subject) WHERE deleted_at IS NULL;
