package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Truy cập Weekly Task. Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}.
 */
public interface WeeklyTaskRepository {
    WeeklyTask save(WeeklyTask task);
    Optional<WeeklyTask> findById(UUID id);
    /** UC-80 (Teacher): lịch tuần của một teacher, trong khoảng weekStartDate [from, to]. */
    List<WeeklyTask> findByTeacher(UUID teacherId, LocalDate fromWeek, LocalDate toWeek);
    /** UC-80 (Moderator): lịch tuần của cả subject moderator phụ trách. */
    List<WeeklyTask> findBySubject(Subject subject, LocalDate fromWeek, LocalDate toWeek);
    /** UC-86: hàng đợi duyệt — task theo một reviewStatus + subject cụ thể (Moderator chỉ thấy đúng môn mình). */
    Page<WeeklyTask> findBySubjectAndStatus(Subject subject, WeeklyTaskReviewStatus status, Pageable pageable);
}
