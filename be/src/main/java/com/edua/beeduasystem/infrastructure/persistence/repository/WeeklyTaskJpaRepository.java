package com.edua.beeduasystem.infrastructure.persistence.repository;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.WeeklyTaskEntity;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyTaskJpaRepository extends JpaRepository<WeeklyTaskEntity, UUID> {
    List<WeeklyTaskEntity> findByTeacherIdAndWeekStartDateBetweenOrderByWeekStartDateAsc(UUID teacherId, LocalDate fromWeek, LocalDate toWeek);
    List<WeeklyTaskEntity> findBySubjectAndWeekStartDateBetweenOrderByWeekStartDateAsc(Subject subject, LocalDate fromWeek, LocalDate toWeek);
    Page<WeeklyTaskEntity> findBySubjectAndReviewStatus(Subject subject, WeeklyTaskReviewStatus reviewStatus, Pageable pageable);
}
