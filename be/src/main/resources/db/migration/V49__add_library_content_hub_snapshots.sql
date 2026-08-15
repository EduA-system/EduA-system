-- Community Hub publishes immutable snapshots; the source remains in Personal Library.
ALTER TABLE library_contents
    ADD COLUMN IF NOT EXISTS source_library_content_id UUID REFERENCES library_contents(id);

CREATE INDEX IF NOT EXISTS idx_library_contents_source_active
    ON library_contents (source_library_content_id)
    WHERE deleted_at IS NULL;
