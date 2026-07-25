-- V15__create_class_management.sql tao classes/class_members bang BIGSERIAL + teacher_id/student_id
-- BIGINT REFERENCES users(id) -- bang "users" khong ton tai trong bat ky migration nao (chi co
-- "app_users"), nen V15 khong the chay thanh cong tren mot DB moi. ClassEntity/ClassMemberEntity
-- (JPA) hien dang dung UUID + owner_id/app_users. Migration nay tao lai 2 bang tren dung schema
-- UUID khop voi entity thuc te, phuc vu ca Class Management CRUD lan Add Student (UC-36).

DROP TABLE IF EXISTS class_members;
DROP TABLE IF EXISTS classes;

CREATE TABLE classes (
    id          UUID        PRIMARY KEY,
    owner_id    UUID        NOT NULL REFERENCES app_users (id),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    subject     VARCHAR(20) NOT NULL,
    grade       INTEGER     NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_owner_id ON classes (owner_id);
CREATE INDEX idx_classes_status ON classes (status);
CREATE INDEX idx_classes_subject ON classes (subject);

CREATE TABLE class_members (
    id         UUID        PRIMARY KEY,
    class_id   UUID        NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
    student_id UUID        NOT NULL REFERENCES app_users (id),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX idx_class_members_class_id ON class_members (class_id);
CREATE INDEX idx_class_members_student_id ON class_members (student_id);
