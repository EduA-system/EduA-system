package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thống kê cho Moderator (tab "Thống kê" trong Quản trị) — luôn scope theo subject của Moderator hiện
 * tại, cùng cách {@code requireSubject()} đã dùng ở {@code WeeklyTaskService}/{@code LibraryContentService}.
 */
@Service
public class ModeratorStatisticsService {

    private final WeeklyTaskRepository weeklyTaskRepository;
    private final LibraryContentRepository libraryContentRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUser;

    public ModeratorStatisticsService(WeeklyTaskRepository weeklyTaskRepository, LibraryContentRepository libraryContentRepository,
                                       AppUserRepository userRepository, CurrentUserProvider currentUser) {
        this.weeklyTaskRepository = weeklyTaskRepository;
        this.libraryContentRepository = libraryContentRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
    }

    /** Bar chart, filter tuần: đếm task trễ hạn theo GV trong đúng 1 tuần (weekStartDate được chuẩn hoá về Thứ Hai). */
    @Transactional(readOnly = true)
    public ModeratorStatisticsViews.OverdueByTeacher overdueByTeacherForWeek(LocalDate weekStartDate) {
        LocalDate monday = mondayOf(weekStartDate != null ? weekStartDate : LocalDate.now());
        return buildOverdue(requireSubject(), monday, monday);
    }

    /** Bar chart, filter quý: cộng dồn task trễ hạn theo GV trong toàn bộ các tuần thuộc quý. */
    @Transactional(readOnly = true)
    public ModeratorStatisticsViews.OverdueByTeacher overdueByTeacherForQuarter(int year, int quarter) {
        if (quarter < 1 || quarter > 4) {
            throw new IllegalArgumentException("Quý chỉ được chọn từ 1 đến 4.");
        }
        LocalDate quarterStart = LocalDate.of(year, (quarter - 1) * 3 + 1, 1);
        LocalDate quarterEnd = quarterStart.plusMonths(3).minusDays(1);
        return buildOverdue(requireSubject(), quarterStart, quarterEnd);
    }

    /** Donut Weekly Task: tổng Đã duyệt/Từ chối từ trước đến nay, cùng subject. */
    @Transactional(readOnly = true)
    public ModeratorStatisticsViews.ReviewStatusCounts weeklyTaskReviewSummary() {
        Subject subject = requireSubject();
        long approved = weeklyTaskRepository.countBySubjectAndReviewStatus(subject, WeeklyTaskReviewStatus.APPROVED);
        long rejected = weeklyTaskRepository.countBySubjectAndReviewStatus(subject, WeeklyTaskReviewStatus.REJECTED);
        return new ModeratorStatisticsViews.ReviewStatusCounts(approved, rejected);
    }

    /** Donut Community Hub: tổng Đã duyệt/Từ chối từ trước đến nay, mọi loại nội dung, cùng subject. */
    @Transactional(readOnly = true)
    public ModeratorStatisticsViews.ReviewStatusCounts libraryContentReviewSummary() {
        Subject subject = requireSubject();
        long approved = libraryContentRepository.countByStatusAndSubject(LibraryContentStatus.APPROVED, subject);
        long rejected = libraryContentRepository.countByStatusAndSubject(LibraryContentStatus.REJECTED, subject);
        return new ModeratorStatisticsViews.ReviewStatusCounts(approved, rejected);
    }

    private ModeratorStatisticsViews.OverdueByTeacher buildOverdue(Subject subject, LocalDate fromWeek, LocalDate toWeek) {
        List<WeeklyTaskRepository.TeacherOverdueAggregate> counts = weeklyTaskRepository.countOverdueByTeacher(subject, fromWeek, toWeek);
        Map<UUID, String> names = userRepository.findAllById(counts.stream().map(WeeklyTaskRepository.TeacherOverdueAggregate::teacherId).toList())
                .stream().collect(Collectors.toMap(AppUser::id, ModeratorStatisticsService::displayName));
        List<ModeratorStatisticsViews.TeacherOverdueCount> items = counts.stream()
                .map(c -> new ModeratorStatisticsViews.TeacherOverdueCount(c.teacherId(), names.get(c.teacherId()), c.overdueCount()))
                .sorted(Comparator.comparingLong(ModeratorStatisticsViews.TeacherOverdueCount::overdueCount).reversed())
                .toList();
        return new ModeratorStatisticsViews.OverdueByTeacher(items);
    }

    /** Chuẩn hoá 1 ngày bất kỳ về Thứ Hai của tuần chứa nó — cùng weekStartDate convention với WeeklyTask (BR-52). */
    private static LocalDate mondayOf(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private Subject requireSubject() {
        Subject subject = currentUser.require().subject();
        if (subject == null) {
            throw new ForbiddenOperationException("Tài khoản phải có subject để xem thống kê.");
        }
        return subject;
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
