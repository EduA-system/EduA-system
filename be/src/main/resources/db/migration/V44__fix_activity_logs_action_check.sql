-- Fix schema drift: the activity_logs_action_check constraint on the shared DB was
-- added out-of-band (not via any tracked migration) and is missing REPLACE_IT_STAFF,
-- which ActivityLogAction has had since it was introduced. This caused every
-- "replace IT Staff" action to fail with a 500 (check constraint violation).
-- Recreate the constraint to match the full current ActivityLogAction enum.

ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_check;

ALTER TABLE activity_logs
    ADD CONSTRAINT activity_logs_action_check
    CHECK (action IN (
        'LOGIN',
        'LOGOUT',
        'GRANT_MODERATOR',
        'REPLACE_MODERATOR',
        'REACTIVATE_MODERATOR',
        'GRANT_IT_STAFF',
        'REPLACE_IT_STAFF',
        'REVOKE_IT_STAFF',
        'REACTIVATE_IT_STAFF',
        'GRANT_TEACHER',
        'REVOKE_TEACHER',
        'REACTIVATE_TEACHER',
        'APPROVE_LIBRARY_CONTENT',
        'REJECT_LIBRARY_CONTENT',
        'REMOVE_BLOG_POST',
        'APPROVE_WEEKLY_TASK',
        'REJECT_WEEKLY_TASK',
        'UPDATE_SYSTEM_PROMPT'
    ));
