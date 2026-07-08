-- Product rule: one effective role per user.
-- If historical data contains multiple roles, keep the highest-priority role.

WITH ranked_user_roles AS (
    SELECT
        ur.id,
        ROW_NUMBER() OVER (
            PARTITION BY ur.user_id
            ORDER BY
                CASE r.name
                    WHEN 'ADMINISTRATOR' THEN 1
                    WHEN 'MODERATOR' THEN 2
                    WHEN 'TEACHER' THEN 3
                    ELSE 4
                END,
                ur.granted_at DESC,
                ur.id
        ) AS role_rank
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
)
DELETE FROM user_roles ur
USING ranked_user_roles ranked
WHERE ur.id = ranked.id
  AND ranked.role_rank > 1;

ALTER TABLE user_roles
    ADD CONSTRAINT uq_user_roles_user UNIQUE (user_id);
