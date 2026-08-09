package com.edua.beeduasystem.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

/**
 * Khối (10/11/12) một giáo viên phụ trách — bảng nối user_id × grade, khoá chính ghép.
 *
 * <p>Ánh xạ JPA thay cho SQL thô qua JdbcTemplate: {@code ModeratorTeacherService.addTeacher}
 * tạo {@code app_users} bằng JPA rồi ghi khối ngay sau đó trong cùng một transaction. Bản
 * JdbcTemplate chạy INSERT thẳng xuống connection trước khi Hibernate flush row app_users
 * đang treo trong persistence context, nên vỡ FK {@code teacher_grades_user_id_fkey}. Đi qua
 * JPA thì cả hai insert nằm chung một action queue và chạy đúng thứ tự lúc flush.
 */
@Entity
@Table(name = "teacher_grades")
@IdClass(TeacherGradeEntity.TeacherGradeId.class)
@Getter
@Setter
@NoArgsConstructor
public class TeacherGradeEntity {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "grade", nullable = false)
    private Integer grade;

    public TeacherGradeEntity(UUID userId, Integer grade) {
        this.userId = userId;
        this.grade = grade;
    }

    /** Khoá chính ghép (user_id, grade); JPA yêu cầu Serializable + equals/hashCode + ctor rỗng. */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class TeacherGradeId implements Serializable {
        private UUID userId;
        private Integer grade;
    }
}
