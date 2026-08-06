CREATE TABLE IF NOT EXISTS teacher_grades (
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    grade INTEGER NOT NULL,
    PRIMARY KEY (user_id, grade),
    CONSTRAINT chk_teacher_grades_grade CHECK (grade IN (10, 11, 12))
);

CREATE INDEX IF NOT EXISTS idx_teacher_grades_grade
    ON teacher_grades (grade);
