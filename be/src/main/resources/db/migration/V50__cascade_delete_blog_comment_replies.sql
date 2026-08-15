ALTER TABLE blog_comments
    DROP CONSTRAINT IF EXISTS blog_comments_parent_comment_id_fkey;

ALTER TABLE blog_comments
    ADD CONSTRAINT blog_comments_parent_comment_id_fkey
        FOREIGN KEY (parent_comment_id) REFERENCES blog_comments (id) ON DELETE CASCADE;
