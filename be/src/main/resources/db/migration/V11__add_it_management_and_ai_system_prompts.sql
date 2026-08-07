INSERT INTO roles (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'IT_STAFF')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE ai_system_prompts (
    prompt_key VARCHAR(40) PRIMARY KEY,
    instruction TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES app_users (id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ai_system_prompts (prompt_key, instruction) VALUES
  ('LESSON_PLAN', ''),
  ('SLIDE_OUTLINE', ''),
  ('SLIDE_DESIGN', ''),
  ('MOLECULE', '')
ON CONFLICT (prompt_key) DO NOTHING;
