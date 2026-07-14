CREATE TABLE library_contents (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES app_users(id),
    type VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'PRIVATE',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_library_contents_owner_updated ON library_contents (owner_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_library_contents_owner_type ON library_contents (owner_id, type) WHERE deleted_at IS NULL;
CREATE INDEX idx_library_contents_owner_subject ON library_contents (owner_id, subject) WHERE deleted_at IS NULL;
CREATE INDEX idx_library_contents_title_search ON library_contents USING GIN (to_tsvector('simple', title));
