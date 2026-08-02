CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(50),
    grade_level VARCHAR(50),
    section VARCHAR(50),
    room VARCHAR(100),
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE class_members (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_class_members_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    CONSTRAINT fk_class_members_student FOREIGN KEY (student_id) REFERENCES users(id),
    CONSTRAINT uq_class_members UNIQUE (class_id, student_id)
);

CREATE INDEX idx_classes_teacher_status ON classes (teacher_id, status);
CREATE INDEX idx_classes_status ON classes (status);
CREATE INDEX idx_class_members_class_id ON class_members (class_id);
