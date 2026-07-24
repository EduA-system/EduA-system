ALTER TABLE library_contents ADD COLUMN IF NOT EXISTS grade INTEGER;

CREATE INDEX IF NOT EXISTS idx_library_contents_owner_grade
    ON library_contents (owner_id, grade)
    WHERE deleted_at IS NULL;
