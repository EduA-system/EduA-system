package com.edua.beeduasystem.repository.repositories;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface TeacherGradeRepository {
    void replaceGrades(UUID userId, Collection<Integer> grades);
    Map<UUID, List<Integer>> findGradesByUserIds(Collection<UUID> userIds);
}
