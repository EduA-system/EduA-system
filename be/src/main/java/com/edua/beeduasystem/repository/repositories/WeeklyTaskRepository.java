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
    /** UC-80 (Moderator, không chọn khối): lịch tuần của cả subject moderator phụ trách, mọi khối. */
    List<WeeklyTask> findBySubject(Subject subject, LocalDate fromWeek, LocalDate toWeek);
    /** UC-80 (Moderator, BR-51): lịch tuần của cả subject, lọc đúng 1 khối. Dùng luôn cho check trùng lịch ở bulkCreate (from=to=weekStartDate). */
    List<WeeklyTask> findBySubjectAndGrade(Subject subject, Integer grade, LocalDate fromWeek, LocalDate toWeek);
    /**
     * UC-86: hàng đợi duyệt — task theo reviewStatus + subject (Moderator chỉ thấy đúng môn mình).
     * {@code grade}, {@code chapterCode}, {@code lessonCode} (BR-51/BR-53, chọn qua dropdown, không phải
     * tìm tự do) đều optional — {@code null} nghĩa là không lọc theo chiều đó.
     */
    Page<WeeklyTask> searchModerationQueue(Subject subject, WeeklyTaskReviewStatus status, Integer grade,
                                            String chapterCode, String lessonCode, Pageable pageable);

    /**
     * Thống kê Mod: số task trễ hạn (deadline đã qua, chưa nộp) theo từng giáo viên, group theo
     * teacherId, trong khoảng weekStartDate [fromWeek, toWeek] (tuần: from=to; quý: đầu-cuối quý).
     * Giáo viên không có task trễ hạn nào trong khoảng đó sẽ không xuất hiện trong kết quả.
     */
    List<TeacherOverdueAggregate> countOverdueByTeacher(Subject subject, LocalDate fromWeek, LocalDate toWeek);

    /** Thống kê Mod: tổng số task theo reviewStatus, cùng subject — dùng cho donut Duyệt/Từ chối. */
    long countBySubjectAndReviewStatus(Subject subject, WeeklyTaskReviewStatus status);

    record TeacherOverdueAggregate(UUID teacherId, long overdueCount) { }
}
