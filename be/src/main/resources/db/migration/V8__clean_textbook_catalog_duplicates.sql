-- Clean catalog rows that were imported from book headings/front matter instead of teachable content.

-- LI10 has a duplicated "CHUONG I": CH0 is only a heading row with one heading lesson.
DELETE FROM lessons l
USING chapters c, textbooks t
WHERE l.chapter_id = c.id
  AND c.textbook_id = t.id
  AND t.code = 'LI10'
  AND c.code = 'CH0';

DELETE FROM chapters c
USING textbooks t
WHERE c.textbook_id = t.id
  AND t.code = 'LI10'
  AND c.code = 'CH0';

-- HOA_12 CH0 contains front matter only: cover/title, usage guide, and foreword rows.
DELETE FROM lessons l
USING chapters c, textbooks t
WHERE l.chapter_id = c.id
  AND c.textbook_id = t.id
  AND t.code = 'HOA_12'
  AND c.code = 'CH0';

DELETE FROM chapters c
USING textbooks t
WHERE c.textbook_id = t.id
  AND t.code = 'HOA_12'
  AND c.code = 'CH0';

-- Remove known empty metadata chapters.
DELETE FROM chapters c
USING textbooks t
WHERE c.textbook_id = t.id
  AND (
      (t.code = 'HOA_12' AND c.code = 'END')
      OR (t.code = 'TOAN12_T1' AND c.code = 'CH0')
  )
  AND NOT EXISTS (
      SELECT 1
      FROM lessons l
      WHERE l.chapter_id = c.id
  );

-- Keep chapter ordering contiguous after deleting imported metadata rows.
WITH ranked AS (
    SELECT
        c.id,
        ROW_NUMBER() OVER (
            PARTITION BY c.textbook_id
            ORDER BY c.sort_order ASC, c.code ASC
        ) - 1 AS next_sort_order
    FROM chapters c
)
UPDATE chapters c
SET sort_order = ranked.next_sort_order
FROM ranked
WHERE c.id = ranked.id;
