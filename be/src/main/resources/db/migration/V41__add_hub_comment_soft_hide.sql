ALTER TABLE hub_content_comments
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES app_users (id);

CREATE INDEX IF NOT EXISTS idx_hub_content_comments_visible_content
    ON hub_content_comments (library_content_id)
    WHERE hidden_at IS NULL;
