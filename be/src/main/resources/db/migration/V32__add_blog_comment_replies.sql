ALTER TABLE blog_comments
    ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES blog_comments (id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_parent ON blog_comments (parent_comment_id);
