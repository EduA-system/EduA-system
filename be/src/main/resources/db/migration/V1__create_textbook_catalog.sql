-- Catalog SGK (KNTT) chuẩn hóa: textbooks -> chapters -> lessons.
-- Dữ liệu read-only; seed bằng app importer (TextbookCatalogImporter) từ JSON classpath.

CREATE TABLE textbooks (
    id         UUID         PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE,
    name       VARCHAR(200) NOT NULL,
    grade      INTEGER      NOT NULL,
    source     VARCHAR(200),
    publisher  VARCHAR(200),
    series     VARCHAR(200)
);

CREATE TABLE chapters (
    id          UUID         PRIMARY KEY,
    textbook_id UUID         NOT NULL REFERENCES textbooks (id),
    code        VARCHAR(20)  NOT NULL,
    name        VARCHAR(500) NOT NULL,
    sort_order  INTEGER      NOT NULL,
    CONSTRAINT uq_chapters_textbook_code UNIQUE (textbook_id, code)
);

CREATE TABLE lessons (
    id             UUID         PRIMARY KEY,
    chapter_id     UUID         NOT NULL REFERENCES chapters (id),
    code           VARCHAR(20)  NOT NULL,
    name           VARCHAR(500) NOT NULL,
    page           INTEGER,
    sort_order     INTEGER      NOT NULL,
    knowledge_json JSONB,
    CONSTRAINT uq_lessons_chapter_code UNIQUE (chapter_id, code)
);

CREATE INDEX idx_chapters_textbook ON chapters (textbook_id);
CREATE INDEX idx_lessons_chapter ON lessons (chapter_id);
