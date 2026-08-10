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
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WeeklyTaskJpaRepository extends JpaRepository<WeeklyTaskEntity, UUID> {
    List<WeeklyTaskEntity> findByTeacherIdAndWeekStartDateBetweenOrderByWeekStartDateAsc(UUID teacherId, LocalDate fromWeek, LocalDate toWeek);
    List<WeeklyTaskEntity> findBySubjectAndWeekStartDateBetweenOrderByWeekStartDateAsc(Subject subject, LocalDate fromWeek, LocalDate toWeek);
    List<WeeklyTaskEntity> findBySubjectAndGradeAndWeekStartDateBetweenOrderByWeekStartDateAsc(Subject subject, Integer grade, LocalDate fromWeek, LocalDate toWeek);

    @Query("""
            SELECT e FROM WeeklyTaskEntity e
            WHERE e.subject = :subject
              AND e.reviewStatus = :status
              AND (:grade IS NULL OR e.grade = :grade)
              AND (:chapterCode IS NULL OR e.chapterCode = :chapterCode)
              AND (:lessonCode IS NULL OR e.lessonCode = :lessonCode)
            """)
    Page<WeeklyTaskEntity> searchModerationQueue(@Param("subject") Subject subject, @Param("status") WeeklyTaskReviewStatus status,
                                                  @Param("grade") Integer grade, @Param("chapterCode") String chapterCode,
                                                  @Param("lessonCode") String lessonCode, Pageable pageable);

    /** Thống kê Mod: raw teacherId + count, map sang {@code TeacherOverdueAggregate} ở tầng adapter. */
    @Query("""
            SELECT e.teacherId, COUNT(e) FROM WeeklyTaskEntity e
            WHERE e.subject = :subject
              AND e.weekStartDate BETWEEN :fromWeek AND :toWeek
              AND e.reviewStatus = com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus.NOT_SUBMITTED
              AND e.deadline < CURRENT_TIMESTAMP
            GROUP BY e.teacherId
            """)
    List<Object[]> countOverdueByTeacherRaw(@Param("subject") Subject subject, @Param("fromWeek") LocalDate fromWeek,
                                             @Param("toWeek") LocalDate toWeek);

    long countBySubjectAndReviewStatus(Subject subject, WeeklyTaskReviewStatus reviewStatus);

    @Query("""
            SELECT e.weekStartDate, e.reviewStatus, COUNT(e) FROM WeeklyTaskEntity e
            WHERE e.weekStartDate BETWEEN :fromWeek AND :toWeek
              AND (:subject IS NULL OR e.subject = :subject)
            GROUP BY e.weekStartDate, e.reviewStatus
            ORDER BY e.weekStartDate ASC
            """)
    List<Object[]> countByWeekAndReviewStatusRaw(@Param("fromWeek") LocalDate fromWeek,
                                                 @Param("toWeek") LocalDate toWeek,
                                                 @Param("subject") Subject subject);
}
