ALTER TABLE hub_content_comments
    ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES hub_content_comments (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hub_content_comments_parent ON hub_content_comments (parent_comment_id);
