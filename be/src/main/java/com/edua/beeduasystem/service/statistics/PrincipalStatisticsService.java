package com.edua.beeduasystem.service.statistics;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PrincipalStatisticsService {

    private static final List<Subject> SUBJECTS = List.of(Subject.MATH, Subject.PHYSICS, Subject.CHEMISTRY);
    private static final List<Role> ACCOUNT_ROLES = List.of(Role.TEACHER, Role.MODERATOR, Role.IT_STAFF, Role.STUDENT);

    private final LibraryContentRepository libraryContentRepository;
    private final WeeklyTaskRepository weeklyTaskRepository;
    private final AppUserRepository appUserRepository;

    public PrincipalStatisticsService(LibraryContentRepository libraryContentRepository, WeeklyTaskRepository weeklyTaskRepository,
                                      AppUserRepository appUserRepository) {
        this.libraryContentRepository = libraryContentRepository;
        this.weeklyTaskRepository = weeklyTaskRepository;
        this.appUserRepository = appUserRepository;
    }

    @Transactional(readOnly = true)
    public PrincipalStatisticsViews.AiContentTrend aiContentTrend(int rawMonths) {
        int months = Math.max(1, Math.min(rawMonths, 24));
        YearMonth current = YearMonth.now(ZoneOffset.UTC);
        YearMonth first = current.minusMonths(months - 1L);
        Instant from = first.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = current.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        Map<String, EnumMap<LibraryContentType, Long>> counts = new java.util.HashMap<>();
        for (var row : libraryContentRepository.countCreatedByMonthAndType(from, to)) {
            counts.computeIfAbsent(row.month(), ignored -> new EnumMap<>(LibraryContentType.class)).put(row.type(), row.count());
        }

        List<PrincipalStatisticsViews.AiContentTrendBucket> items = java.util.stream.IntStream.range(0, months)
                .mapToObj(first::plusMonths)
                .map(month -> {
                    String key = month.toString();
                    return new PrincipalStatisticsViews.AiContentTrendBucket(key, month.atDay(1), count(counts.get(key), LibraryContentType.LESSON_PLAN),
                            count(counts.get(key), LibraryContentType.SLIDE_DECK), count(counts.get(key), LibraryContentType.TEST),
                            count(counts.get(key), LibraryContentType.SIMULATION));
                })
                .toList();
        return new PrincipalStatisticsViews.AiContentTrend(items);
    }

    @Transactional(readOnly = true)
    public PrincipalStatisticsViews.ContentBySubject contentBySubject() {
        Map<Subject, EnumMap<LibraryContentType, Long>> counts = new EnumMap<>(Subject.class);
        for (var row : libraryContentRepository.countBySubjectAndType()) {
            counts.computeIfAbsent(row.subject(), ignored -> new EnumMap<>(LibraryContentType.class)).put(row.type(), row.count());
        }
        return new PrincipalStatisticsViews.ContentBySubject(SUBJECTS.stream()
                .map(subject -> new PrincipalStatisticsViews.SubjectContentCount(subject, count(counts.get(subject), LibraryContentType.LESSON_PLAN),
                        count(counts.get(subject), LibraryContentType.SLIDE_DECK), count(counts.get(subject), LibraryContentType.TEST),
                        count(counts.get(subject), LibraryContentType.SIMULATION)))
                .toList());
    }

    @Transactional(readOnly = true)
    public PrincipalStatisticsViews.WeeklyTaskStatus weeklyTaskStatus(LocalDate from, LocalDate to, Subject subject) {
        LocalDate resolvedTo = mondayOf(to != null ? to : LocalDate.now());
        LocalDate resolvedFrom = mondayOf(from != null ? from : resolvedTo.minusWeeks(11));
        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new IllegalArgumentException("Ngày bắt đầu không được sau ngày kết thúc.");
        }

        Map<LocalDate, EnumMap<WeeklyTaskReviewStatus, Long>> counts = new java.util.HashMap<>();
        for (var row : weeklyTaskRepository.countByWeekAndReviewStatus(resolvedFrom, resolvedTo, subject)) {
            counts.computeIfAbsent(row.weekStartDate(), ignored -> new EnumMap<>(WeeklyTaskReviewStatus.class)).put(row.status(), row.count());
        }

        List<PrincipalStatisticsViews.WeeklyTaskStatusBucket> items = resolvedFrom.datesUntil(resolvedTo.plusWeeks(1), java.time.Period.ofWeeks(1))
                .map(week -> {
                    EnumMap<WeeklyTaskReviewStatus, Long> weekCounts = counts.get(week);
                    long submitted = count(weekCounts, WeeklyTaskReviewStatus.SUBMITTED) + count(weekCounts, WeeklyTaskReviewStatus.REJECTED);
                    return new PrincipalStatisticsViews.WeeklyTaskStatusBucket(week, count(weekCounts, WeeklyTaskReviewStatus.NOT_SUBMITTED),
                            submitted, count(weekCounts, WeeklyTaskReviewStatus.APPROVED));
                })
                .toList();
        return new PrincipalStatisticsViews.WeeklyTaskStatus(items);
    }

    @Transactional(readOnly = true)
    public PrincipalStatisticsViews.CommunityHubReview communityHubReview() {
        return new PrincipalStatisticsViews.CommunityHubReview(
                libraryContentRepository.countByStatus(LibraryContentStatus.SUBMITTED),
                libraryContentRepository.countByStatus(LibraryContentStatus.APPROVED),
                libraryContentRepository.countByStatus(LibraryContentStatus.REJECTED));
    }

    @Transactional(readOnly = true)
    public PrincipalStatisticsViews.AccountsByRole accountsByRole(Subject subject) {
        Map<Role, long[]> counts = new EnumMap<>(Role.class);
        for (var row : appUserRepository.countActiveInactiveByRole(subject)) {
            long[] pair = counts.computeIfAbsent(row.role(), ignored -> new long[2]);
            if (row.active()) {
                pair[0] = row.count();
            } else {
                pair[1] = row.count();
            }
        }
        return new PrincipalStatisticsViews.AccountsByRole(ACCOUNT_ROLES.stream()
                .map(role -> {
                    long[] pair = counts.getOrDefault(role, new long[2]);
                    return new PrincipalStatisticsViews.AccountRoleStatus(role, pair[0], pair[1]);
                })
                .toList());
    }

    private static LocalDate mondayOf(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    private static long count(EnumMap<LibraryContentType, Long> counts, LibraryContentType type) {
        return counts != null ? counts.getOrDefault(type, 0L) : 0L;
    }

    private static long count(EnumMap<WeeklyTaskReviewStatus, Long> counts, WeeklyTaskReviewStatus status) {
        return counts != null ? counts.getOrDefault(status, 0L) : 0L;
    }
}
