package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
public class JdbcTeacherGradeRepository implements TeacherGradeRepository {
    private final JdbcTemplate jdbc;

    public JdbcTeacherGradeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void replaceGrades(UUID userId, Collection<Integer> grades) {
        jdbc.update("DELETE FROM teacher_grades WHERE user_id = ?", userId);
        for (Integer grade : grades) {
            jdbc.update("INSERT INTO teacher_grades (user_id, grade) VALUES (?, ?)", userId, grade);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, List<Integer>> findGradesByUserIds(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        String placeholders = String.join(",", userIds.stream().map(_id -> "?").toList());
        List<Object> args = new ArrayList<>(userIds);
        Map<UUID, List<Integer>> result = new LinkedHashMap<>();
        jdbc.query(
                "SELECT user_id, grade FROM teacher_grades WHERE user_id IN (" + placeholders + ") ORDER BY grade ASC",
                rs -> {
                    UUID userId = rs.getObject("user_id", UUID.class);
                    result.computeIfAbsent(userId, ignored -> new ArrayList<>()).add(rs.getInt("grade"));
                },
                args.toArray());
        return result;
    }
}
