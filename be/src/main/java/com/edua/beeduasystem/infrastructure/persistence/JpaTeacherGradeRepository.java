package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.infrastructure.persistence.entity.TeacherGradeEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.TeacherGradeJpaRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class JpaTeacherGradeRepository implements TeacherGradeRepository {

    private final TeacherGradeJpaRepository jpa;

    public JpaTeacherGradeRepository(TeacherGradeJpaRepository jpa) {
        this.jpa = jpa;
    }

    /**
     * Ghi theo delta (xoá khối thừa, thêm khối thiếu) chứ không delete-all rồi insert-all:
     * lúc flush Hibernate xếp toàn bộ DELETE xuống sau INSERT, nên xoá rồi chèn lại đúng khoá
     * chính trong cùng một transaction sẽ đụng PK (user_id, grade).
     */
    @Override
    @Transactional
    public void replaceGrades(UUID userId, Collection<Integer> grades) {
        Set<Integer> wanted = grades == null ? Set.of() : new LinkedHashSet<>(grades);
        List<TeacherGradeEntity> existing = jpa.findByUserId(userId);
        Set<Integer> current = existing.stream().map(TeacherGradeEntity::getGrade).collect(Collectors.toSet());

        for (TeacherGradeEntity entity : existing) {
            if (!wanted.contains(entity.getGrade())) jpa.delete(entity);
        }
        for (Integer grade : wanted) {
            if (!current.contains(grade)) jpa.save(new TeacherGradeEntity(userId, grade));
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, List<Integer>> findGradesByUserIds(Collection<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<Integer>> result = new LinkedHashMap<>();
        for (TeacherGradeEntity entity : jpa.findByUserIdIn(List.copyOf(userIds))) {
            result.computeIfAbsent(entity.getUserId(), ignored -> new ArrayList<>()).add(entity.getGrade());
        }
        result.values().forEach(Collections::sort);
        return result;
    }
}
