package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.WeeklyTaskEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.WeeklyTaskJpaRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JpaWeeklyTaskRepository implements WeeklyTaskRepository {
    private final WeeklyTaskJpaRepository jpa;
    public JpaWeeklyTaskRepository(WeeklyTaskJpaRepository jpa) { this.jpa = jpa; }

    @Override @Transactional public WeeklyTask save(WeeklyTask t) {
        WeeklyTaskEntity e = jpa.findById(t.id()).orElseGet(WeeklyTaskEntity::new);
        e.setId(t.id()); e.setModeratorId(t.moderatorId()); e.setSubject(t.subject()); e.setGrade(t.grade());
        e.setTeacherId(t.teacherId());
        e.setWeekStartDate(t.weekStartDate()); e.setScopeDescription(t.scopeDescription()); e.setDeadline(t.deadline());
        e.setTextbookCode(t.textbookCode()); e.setChapterCode(t.chapterCode()); e.setChapterName(t.chapterName());
        e.setLessonCode(t.lessonCode()); e.setLessonName(t.lessonName());
        e.setReviewStatus(t.reviewStatus()); e.setSourceLibraryContentId(t.sourceLibraryContentId());
        e.setSourceLibraryContentTitle(t.sourceLibraryContentTitle()); e.setSourceLibraryContentPayload(t.sourceLibraryContentPayload());
        e.setSourceDocumentUrl(t.sourceDocumentUrl()); e.setSourceDocumentName(t.sourceDocumentName());
        e.setSubmittedAt(t.submittedAt()); e.setReviewedBy(t.reviewedBy()); e.setReviewedAt(t.reviewedAt());
        e.setRejectionReason(t.rejectionReason()); e.setCreatedAt(t.createdAt()); e.setUpdatedAt(t.updatedAt());
        return toDomain(jpa.save(e));
    }

    @Override @Transactional(readOnly = true) public Optional<WeeklyTask> findById(UUID id) {
        return jpa.findById(id).map(JpaWeeklyTaskRepository::toDomain);
    }

    @Override @Transactional(readOnly = true) public List<WeeklyTask> findByTeacher(UUID teacherId, LocalDate fromWeek, LocalDate toWeek) {
        return jpa.findByTeacherIdAndWeekStartDateBetweenOrderByWeekStartDateAsc(teacherId, fromWeek, toWeek).stream().map(JpaWeeklyTaskRepository::toDomain).toList();
    }

    @Override @Transactional(readOnly = true) public List<WeeklyTask> findBySubject(Subject subject, LocalDate fromWeek, LocalDate toWeek) {
        return jpa.findBySubjectAndWeekStartDateBetweenOrderByWeekStartDateAsc(subject, fromWeek, toWeek).stream().map(JpaWeeklyTaskRepository::toDomain).toList();
    }

    @Override @Transactional(readOnly = true) public List<WeeklyTask> findBySubjectAndGrade(Subject subject, Integer grade, LocalDate fromWeek, LocalDate toWeek) {
        return jpa.findBySubjectAndGradeAndWeekStartDateBetweenOrderByWeekStartDateAsc(subject, grade, fromWeek, toWeek).stream().map(JpaWeeklyTaskRepository::toDomain).toList();
    }

    @Override @Transactional(readOnly = true) public Page<WeeklyTask> searchModerationQueue(Subject subject, WeeklyTaskReviewStatus status, Integer grade, String chapterCode, String lessonCode, Pageable pageable) {
        return jpa.searchModerationQueue(subject, status, grade, chapterCode, lessonCode, pageable).map(JpaWeeklyTaskRepository::toDomain);
    }

    @Override @Transactional(readOnly = true) public List<TeacherOverdueAggregate> countOverdueByTeacher(Subject subject, LocalDate fromWeek, LocalDate toWeek) {
        return jpa.countOverdueByTeacherRaw(subject, fromWeek, toWeek).stream()
                .map(row -> new TeacherOverdueAggregate((UUID) row[0], ((Number) row[1]).longValue()))
                .toList();
    }

    @Override @Transactional(readOnly = true) public long countBySubjectAndReviewStatus(Subject subject, WeeklyTaskReviewStatus status) {
        return jpa.countBySubjectAndReviewStatus(subject, status);
    }

    private static WeeklyTask toDomain(WeeklyTaskEntity e) {
        return new WeeklyTask(e.getId(), e.getModeratorId(), e.getSubject(), e.getGrade(), e.getTeacherId(), e.getWeekStartDate(),
                e.getScopeDescription(), e.getTextbookCode(), e.getChapterCode(), e.getChapterName(), e.getLessonCode(), e.getLessonName(),
                e.getDeadline(), e.getReviewStatus(), e.getSourceLibraryContentId(),
                e.getSourceLibraryContentTitle(), e.getSourceLibraryContentPayload(), e.getSourceDocumentUrl(), e.getSourceDocumentName(), e.getSubmittedAt(), e.getReviewedBy(),
                e.getReviewedAt(), e.getRejectionReason(), e.getCreatedAt(), e.getUpdatedAt(), e.getVersion());
    }
}
