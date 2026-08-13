-- Community Hub's default feed filters APPROVED content and orders it by most recently updated.
CREATE INDEX IF NOT EXISTS idx_library_contents_hub_approved_updated
    ON library_contents (updated_at DESC)
    WHERE status = 'APPROVED';
