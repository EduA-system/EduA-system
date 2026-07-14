-- Lightweight textbook catalog for dropdowns.
-- Keeps names and subject metadata separate from the full textbook tree.

CREATE TABLE textbook_names (
    id           UUID         PRIMARY KEY,
    textbook_id  UUID         NOT NULL UNIQUE REFERENCES textbooks (id) ON DELETE CASCADE,
    code         VARCHAR(20)  NOT NULL UNIQUE,
    name         VARCHAR(200) NOT NULL,
    grade        INTEGER      NOT NULL,
    subject_code VARCHAR(40)  NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    volume       INTEGER,
    publisher    VARCHAR(200),
    series       VARCHAR(200),
    sort_order   INTEGER      NOT NULL
);

INSERT INTO textbook_names (
    id,
    textbook_id,
    code,
    name,
    grade,
    subject_code,
    subject_name,
    volume,
    publisher,
    series,
    sort_order
)
SELECT
    ranked.id,
    ranked.id,
    ranked.code,
    ranked.name,
    ranked.grade,
    ranked.subject_code,
    ranked.subject_name,
    ranked.volume,
    ranked.publisher,
    ranked.series,
    (ranked.row_no - 1)::INTEGER
FROM (
    SELECT
        t.id,
        t.code,
        t.name,
        t.grade,
        CASE
            WHEN t.code LIKE 'LI%' THEN 'PHYSICS'
            WHEN t.code LIKE 'HOA%' THEN 'CHEMISTRY'
            WHEN t.code LIKE 'TOAN%' THEN 'MATH'
            ELSE 'OTHER'
        END AS subject_code,
        CASE
            WHEN t.code LIKE 'LI%' THEN 'Vật lí'
            WHEN t.code LIKE 'HOA%' THEN 'Hóa học'
            WHEN t.code LIKE 'TOAN%' THEN 'Toán'
            ELSE 'Khác'
        END AS subject_name,
        CASE
            WHEN t.code LIKE '%_T1' THEN 1
            WHEN t.code LIKE '%_T2' THEN 2
            ELSE NULL
        END AS volume,
        t.publisher,
        t.series,
        ROW_NUMBER() OVER (
            ORDER BY
                CASE
                    WHEN t.code LIKE 'LI%' THEN 1
                    WHEN t.code LIKE 'HOA%' THEN 2
                    WHEN t.code LIKE 'TOAN%' THEN 3
                    ELSE 9
                END,
                t.grade,
                CASE
                    WHEN t.code LIKE '%_T1' THEN 1
                    WHEN t.code LIKE '%_T2' THEN 2
                    ELSE 0
                END,
                t.code
        ) AS row_no
    FROM textbooks t
) ranked;

CREATE INDEX idx_textbook_names_subject_grade ON textbook_names (subject_code, grade, sort_order);
