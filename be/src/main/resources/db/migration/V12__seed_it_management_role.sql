-- V11 may already be recorded by Flyway in existing development databases.
-- Seed the new role in a separate migration so it is applied to those databases too.
INSERT INTO roles (id, name) VALUES
  ('a0000000-0000-0000-0000-000000000004', 'IT_MANAGEMENT')
ON CONFLICT (name) DO NOTHING;
