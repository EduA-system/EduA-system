ALTER TABLE blog_comments
    ADD COLUMN hidden_at TIMESTAMPTZ,
    ADD COLUMN hidden_by UUID REFERENCES app_users (id);

CREATE INDEX idx_blog_comments_visible_post ON blog_comments (post_id) WHERE hidden_at IS NULL;
