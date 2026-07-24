-- Replace the four broad prompt settings with one editable instruction per AI process.
-- Existing non-empty instructions are retained for every child process in their former group.
INSERT INTO ai_system_prompts (prompt_key, instruction, updated_at)
SELECT child_key, instruction, now()
FROM ai_system_prompts
CROSS JOIN (VALUES
    ('LESSON_PLAN', 'LESSON_PLAN_OBJECTIVES'),
    ('LESSON_PLAN', 'LESSON_PLAN_MATERIALS'),
    ('LESSON_PLAN', 'LESSON_PLAN_ACTIVITIES_FRAME'),
    ('LESSON_PLAN', 'LESSON_PLAN_ACTIVITY_DETAIL'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_DECK_BLUEPRINT'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_CONTENT_MAP'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_STRUCTURE'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_MERGED'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_PART_SKELETON'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_EXPAND_PART'),
    ('SLIDE_OUTLINE', 'SLIDE_OUTLINE_SPLIT_ITEM'),
    ('SLIDE_DESIGN', 'SLIDE_DESIGN_BACKGROUND'),
    ('SLIDE_DESIGN', 'SLIDE_DESIGN_STRUCTURE'),
    ('SLIDE_DESIGN', 'SLIDE_DESIGN_CONTENT_FILL'),
    ('SLIDE_DESIGN', 'SLIDE_DESIGN_CONTENT_SLOTS'),
    ('MOLECULE', 'MOLECULE_STRUCTURE')
) AS mapping(parent_key, child_key)
WHERE ai_system_prompts.prompt_key = mapping.parent_key
  AND btrim(ai_system_prompts.instruction) <> ''
ON CONFLICT (prompt_key) DO NOTHING;

DELETE FROM ai_system_prompts
WHERE prompt_key IN ('LESSON_PLAN', 'SLIDE_OUTLINE', 'SLIDE_DESIGN', 'MOLECULE');
