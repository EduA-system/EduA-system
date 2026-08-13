package com.edua.beeduasystem.service.weeklytask;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use-case Weekly Task (UC-80..89): Moderator giao yêu cầu giáo án cho Teacher cùng subject + khối, kèm hạn nộp;
 * Teacher nộp/nộp lại/rút giáo án; Moderator duyệt. {@code reviewStatus} tách biệt hoàn toàn với
 * Publish Status (Hub) trên {@code LibraryContent}.
 *
 * <p>BR-51/BR-52/BR-53 (đề xuất, {@code designs/weekly-task/grade-scoped-deadline-and-review.md}): mỗi
 * task thuộc đúng 1 khối (10/11/12) — giáo viên nhận task phải dạy khối đó theo {@code teacher_grades};
 * hạn nộp không còn là input của Mod, luôn được server tính từ {@code weekStartDate} (Chủ Nhật 23:59:59
 * giờ VN của chính tuần đó, xem {@link #computeDeadline(LocalDate)}); mỗi task gắn đúng 1 Chương + 1 Bài
 * chọn từ danh mục SGK (không phải mô tả tự do) — tối đa 2 bài/tuần cho 1 (subject, grade).</p>
 */
@Service
public class WeeklyTaskService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DEADLINE_FMT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(VN_ZONE);
    private static final int MAX_LESSONS_PER_WEEK = 2;

    // Đích điều hướng khi bấm vào notification. Teacher luôn về màn nộp giáo án (không deep-link — 1
    // giáo viên chỉ có tối đa vài task/tuần, tự nhận ra trong lịch). Moderator về hàng đợi duyệt kèm
    // taskId — bắt buộc phải deep-link vì 1 Moderator có thể nhận nhiều notification nộp bài cùng lúc từ
    // 5-10 giáo viên khác nhau, targetUrl tĩnh sẽ không phân biệt được submission nào ứng với thông báo nào.
    private static final String TARGET_TYPE_TEACHER_SUBMIT = "WEEKLY_TASK_SUBMIT";
    private static final String TARGET_URL_TEACHER_SUBMIT = "/weekly-schedule";
    private static final String TARGET_TYPE_MODERATOR_REVIEW = "WEEKLY_TASK_REVIEW";
    private static final String TARGET_URL_MODERATOR_REVIEW = "/lesson-plan-approval";

    private final WeeklyTaskRepository repository;
    private final LibraryContentRepository libraryContentRepository;
    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeacherGradeRepository teacherGradeRepository;
    private final TextbookCatalogRepository textbookCatalogRepository;
    private final CurrentUserProvider currentUser;
    private final NotificationRepository notificationRepository;
    private final NotificationStreamPort streamPort;
    private final ActivityLogService activityLogService;

    public WeeklyTaskService(WeeklyTaskRepository repository, LibraryContentRepository libraryContentRepository,
                              AppUserRepository userRepository, UserRoleRepository userRoleRepository,
                              TeacherGradeRepository teacherGradeRepository, TextbookCatalogRepository textbookCatalogRepository,
                              CurrentUserProvider currentUser, NotificationRepository notificationRepository,
                              NotificationStreamPort streamPort, ActivityLogService activityLogService) {
        this.repository = repository;
        this.libraryContentRepository = libraryContentRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.teacherGradeRepository = teacherGradeRepository;
        this.textbookCatalogRepository = textbookCatalogRepository;
        this.currentUser = currentUser;
        this.notificationRepository = notificationRepository;
        this.streamPort = streamPort;
        this.activityLogService = activityLogService;
    }

    /** UC-80: lịch tuần theo scope của current user (Teacher: của mình, mọi khối; Moderator: cả subject, lọc khối nếu có). */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Schedule schedule(LocalDate from, LocalDate to, Integer grade) {
        AccessTokenClaims claims = currentUser.require();
        List<WeeklyTask> tasks;
        if (claims.roles().contains(Role.MODERATOR)) {
            tasks = grade != null
                    ? repository.findBySubjectAndGrade(requireSubject(), grade, from, to)
                    : repository.findBySubject(requireSubject(), from, to);
        } else {
            tasks = repository.findByTeacher(claims.userId(), from, to);
        }
        return WeeklyTaskViews.toSchedule(tasks, resolveNames(tasks));
    }

    /** UC-83 (Teacher) / UC-87 (Moderator): xem chi tiết 1 task — cả 2 role dùng chung endpoint. */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Detail get(UUID id) {
        WeeklyTask t = requireVisible(id);
        return WeeklyTaskViews.toDetail(t, resolveNames(List.of(t)));
    }

    /** UC-81: Moderator giao task cho 1 Teacher Active cùng subject + khối (BR-51), gắn 1 Chương + 1 Bài (BR-53). */
    @Transactional
    public WeeklyTaskViews.Detail create(UUID teacherId, LocalDate weekStartDate, Integer grade, String title,
                                          String textbookCode, String chapterCode, String lessonCode) {
        Subject moderatorSubject = requireSubject();
        Integer requiredGrade = requireGrade(grade);
        String scope = requireScope(title);
        ResolvedLesson lesson = resolveLesson(textbookCode, chapterCode, lessonCode);
        requireBookMatchesGrade(lesson.textbookCode(), moderatorSubject, requiredGrade);
        LocalDate monday = mondayOf(weekStartDate);
        Instant deadline = computeDeadline(monday);
        requireWeekNotEnded(deadline);
        requireActiveTeacherInSubjectAndGrade(teacherId, moderatorSubject, requiredGrade);
        requireLessonSlotAvailable(moderatorSubject, requiredGrade, monday, List.of(lesson.lessonCode()), (UUID) null);

        Instant now = Instant.now();
        WeeklyTask saved = repository.save(new WeeklyTask(UUID.randomUUID(), currentUser.requireUserId(), moderatorSubject,
                requiredGrade, teacherId, monday, scope, lesson.textbookCode(), lesson.chapterCode(), lesson.chapterName(),
                lesson.lessonCode(), lesson.lessonName(), deadline, WeeklyTaskReviewStatus.NOT_SUBMITTED,
                null, null, null, null, null, null, null, null, null, now, now, null));
        notify(teacherId, "Nhiệm vụ tuần mới", "Bạn được giao soạn: " + scope + " (" + lesson.chapterName() + " - " + lesson.lessonName()
                + "). Hạn nộp: " + DEADLINE_FMT.format(deadline) + ".", TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** 1 bài học (1 ô lịch tuần) — dùng cho {@link #bulkCreate}. Chương/Bài chọn từ dropdown, không phải mô tả tự do (BR-53). */
    public record LessonRequest(String title, String chapterCode, String lessonCode) {
    }

    /**
     * Bulk UC-81: Moderator giao 1 bài (1 ô lịch tuần) cho MỌI Teacher active cùng subject dạy đúng khối
     * đã chọn (BR-51), trong 1 tuần. Nhận danh sách {@code lessons} để linh hoạt, nhưng UI hiện tại luôn
     * gửi đúng 1 phần tử — mỗi ô lịch = 1 bài. Tối đa {@value #MAX_LESSONS_PER_WEEK} bài/tuần cho 1
     * (subject, grade) (BR-53). Sửa sau đó dùng {@link #update} để cập nhật đồng bộ cả cụm task cùng bài.
     */
    @Transactional
    public WeeklyTaskViews.BulkResult bulkCreate(LocalDate weekStartDate, Integer grade, String textbookCode, List<LessonRequest> lessons) {
        Subject moderatorSubject = requireSubject();
        Integer requiredGrade = requireGrade(grade);
        if (lessons.isEmpty()) {
            throw new IllegalArgumentException("Phải có ít nhất 1 bài học.");
        }
        List<ResolvedLesson> resolvedLessons = lessons.stream()
                .map(l -> resolveLesson(textbookCode, l.chapterCode(), l.lessonCode()).withTitle(requireScope(l.title())))
                .toList();
        requireBookMatchesGrade(textbookCode, moderatorSubject, requiredGrade);

        LocalDate monday = mondayOf(weekStartDate);
        Instant deadline = computeDeadline(monday);
        requireWeekNotEnded(deadline);
        requireLessonSlotAvailable(moderatorSubject, requiredGrade, monday,
                resolvedLessons.stream().map(ResolvedLesson::lessonCode).toList(), (UUID) null);

        List<AppUser> activeTeachers = userRepository.findAllByRoleAndSubject(Role.TEACHER, moderatorSubject, Pageable.unpaged())
                .getContent().stream()
                .filter(t -> t.status() == UserStatus.ACTIVE)
                .toList();
        Map<UUID, List<Integer>> gradesByTeacher = teacherGradeRepository.findGradesByUserIds(
                activeTeachers.stream().map(AppUser::id).toList());
        List<AppUser> teachers = activeTeachers.stream()
                .filter(t -> gradesByTeacher.getOrDefault(t.id(), List.of()).contains(requiredGrade))
                .toList();
        if (teachers.isEmpty()) {
            throw new IllegalArgumentException("Chưa có giáo viên active nào dạy khối " + requiredGrade + " trong môn của bạn.");
        }

        UUID moderatorId = currentUser.requireUserId();
        Instant now = Instant.now();
        List<WeeklyTask> created = new ArrayList<>();
        for (AppUser teacher : teachers) {
            for (ResolvedLesson lesson : resolvedLessons) {
                created.add(repository.save(new WeeklyTask(UUID.randomUUID(), moderatorId, moderatorSubject, requiredGrade,
                        teacher.id(), monday, lesson.title(), lesson.textbookCode(), lesson.chapterCode(), lesson.chapterName(),
                        lesson.lessonCode(), lesson.lessonName(), deadline,
                        WeeklyTaskReviewStatus.NOT_SUBMITTED, null, null, null, null, null, null, null, null, null, now, now, null)));
            }
        }
        for (AppUser teacher : teachers) {
            notify(teacher.id(), "Lịch tuần mới",
                    "Bạn được giao " + resolvedLessons.size() + " bài (khối " + requiredGrade + ") cho tuần " + monday + ".",
                    TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        }
        return WeeklyTaskViews.toBulkResult(created, resolveNames(created), teachers.size(), resolvedLessons.size());
    }

    /**
     * Cấp bù lịch của tuần hiện tại khi một giáo viên vừa được thêm, được khôi phục, hoặc vừa được gán
     * thêm khối dạy. Chỉ sao chép những bài cùng môn/khối còn hạn; mỗi bài chỉ tạo một lần cho giáo viên.
     */
    @Transactional
    public void assignOpenCurrentWeekTasks(UUID teacherId, Subject subject, Collection<Integer> grades) {
        LocalDate currentMonday = LocalDate.now(VN_ZONE).with(DayOfWeek.MONDAY);
        Instant now = Instant.now();
        List<WeeklyTask> assigned = new ArrayList<>();

        for (Integer grade : new LinkedHashSet<>(grades)) {
            List<WeeklyTask> weekTasks = repository.findBySubjectAndGrade(subject, grade, currentMonday, currentMonday);
            Set<String> existingAssignmentKeys = weekTasks.stream()
                    .filter(task -> task.teacherId().equals(teacherId))
                    .map(WeeklyTaskService::assignmentKey)
                    .collect(Collectors.toSet());
            Map<String, WeeklyTask> templates = weekTasks.stream()
                    .filter(task -> task.deadline().isAfter(now))
                    .collect(Collectors.toMap(WeeklyTaskService::assignmentKey, task -> task, (first, ignored) -> first));

            for (Map.Entry<String, WeeklyTask> entry : templates.entrySet()) {
                if (existingAssignmentKeys.add(entry.getKey())) {
                    assigned.add(repository.save(copyForTeacher(entry.getValue(), teacherId, now)));
                }
            }
        }

        if (!assigned.isEmpty()) {
            notify(teacherId, "Lịch tuần mới", "Bạn được bổ sung " + assigned.size()
                    + " nhiệm vụ còn hạn của tuần hiện tại.", TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        }
    }

    /** UC-82: Moderator sửa task còn hạn (BR-47); task tạo bulk được sửa đồng bộ theo cụm cùng tuần/bài/khối.
     * Không được sửa cụm đã có giáo án được duyệt để bảo toàn yêu cầu mà bài nộp đã được duyệt theo. Khối giữ nguyên, không sửa được. */
    @Transactional
    public WeeklyTaskViews.Detail update(UUID id, UUID teacherId, LocalDate weekStartDate, String title,
                                          String textbookCode, String chapterCode, String lessonCode) {
        WeeklyTask t = requireModeratorOwnerInSubject(id);
        requireBeforeDeadline(t);
        List<WeeklyTask> group = findAssignmentGroup(t);
        if (group.stream().anyMatch(task -> task.reviewStatus() == WeeklyTaskReviewStatus.APPROVED)) {
            throw new IllegalArgumentException("Không thể sửa nhiệm vụ đã có giáo án được duyệt.");
        }
        String scope = requireScope(title);
        ResolvedLesson lesson = resolveLesson(textbookCode, chapterCode, lessonCode);
        requireBookMatchesGrade(lesson.textbookCode(), t.subject(), t.grade());
        LocalDate monday = mondayOf(weekStartDate);
        Instant deadline = computeDeadline(monday);
        requireWeekNotEnded(deadline);
        Set<UUID> excludedTaskIds = group.stream().map(WeeklyTask::id).collect(Collectors.toSet());
        requireLessonSlotAvailable(t.subject(), t.grade(), monday, List.of(lesson.lessonCode()), excludedTaskIds);

        boolean reassigned = !teacherId.equals(t.teacherId());
        if (reassigned && group.size() > 1) {
            throw new IllegalArgumentException("Nhiệm vụ theo cụm không thể chuyển riêng giáo viên.");
        }
        if (reassigned) {
            requireActiveTeacherInSubjectAndGrade(teacherId, t.subject(), t.grade());
        }
        List<WeeklyTask> savedGroup = group.stream()
                .map(task -> repository.save(reassigned
                        ? resetForReassignedTeacher(task, teacherId, monday, scope, lesson, deadline)
                        : updateAssignmentFields(task, monday, scope, lesson, deadline)))
                .toList();
        WeeklyTask saved = savedGroup.stream()
                .filter(task -> task.id().equals(t.id()))
                .findFirst()
                .orElse(savedGroup.getFirst());
        if (reassigned) {
            notify(t.teacherId(), "Nhiệm vụ tuần đã được chuyển", "Nhiệm vụ \"" + scope + "\" đã được chuyển cho giáo viên khác.",
                    TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
            notify(teacherId, "Nhiệm vụ tuần mới", "Bạn được giao soạn: " + scope + ". Hạn nộp: " + DEADLINE_FMT.format(deadline) + ".",
                    TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        } else {
            for (WeeklyTask task : savedGroup) {
                notify(task.teacherId(), "Nhiệm vụ tuần đã được cập nhật", "Nhiệm vụ \"" + scope + "\" đã được chỉnh sửa. Hạn nộp mới: " + DEADLINE_FMT.format(deadline) + ".",
                        TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
            }
        }
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-84: Teacher nộp giáo án — chọn đúng 1 nguồn (owned LESSON_PLAN hoặc tài liệu đã upload). */
    @Transactional
    public WeeklyTaskViews.Detail submit(UUID id, UUID libraryContentId, String documentUrl, String documentName) {
        WeeklyTask t = requireAssignedTeacher(id);
        requireBeforeDeadline(t);
        if (t.reviewStatus() != WeeklyTaskReviewStatus.NOT_SUBMITTED && t.reviewStatus() != WeeklyTaskReviewStatus.REJECTED) {
            throw new IllegalArgumentException("Chỉ có thể nộp khi nhiệm vụ chưa nộp hoặc đã bị từ chối.");
        }
        boolean hasLibraryContent = libraryContentId != null;
        boolean hasDocument = documentUrl != null && !documentUrl.isBlank();
        if (hasLibraryContent == hasDocument) {
            throw new IllegalArgumentException("Phải chọn đúng 1 nguồn: giáo án trong thư viện hoặc tệp tải lên.");
        }
        LibraryContent source = null;
        if (hasLibraryContent) {
            LibraryContent c = libraryContentRepository.findActiveById(libraryContentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo án."));
            if (!c.ownerId().equals(currentUser.requireUserId())) {
                throw new ForbiddenOperationException("Bạn chỉ có thể nộp giáo án của chính mình.");
            }
            if (c.type() != LibraryContentType.LESSON_PLAN) {
                throw new IllegalArgumentException("Chỉ có thể nộp nội dung loại giáo án (LESSON_PLAN).");
            }
            source = c;
        }
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.grade(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.textbookCode(), t.chapterCode(), t.chapterName(), t.lessonCode(), t.lessonName(),
                t.deadline(), WeeklyTaskReviewStatus.SUBMITTED,
                hasLibraryContent ? libraryContentId : null, source != null ? source.title() : null, source != null ? source.payload().deepCopy() : null, hasDocument ? documentUrl.trim() : null,
                hasDocument ? (documentName == null ? null : documentName.trim()) : null, Instant.now(),
                null, null, null, t.createdAt(), Instant.now(), t.version()));
        notify(t.moderatorId(), "Giáo án chờ duyệt", "Giáo viên đã nộp giáo án cho nhiệm vụ \"" + t.scopeDescription() + "\".",
                TARGET_TYPE_MODERATOR_REVIEW, TARGET_URL_MODERATOR_REVIEW + "?taskId=" + saved.id());
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-85: Teacher rút nộp — khôi phục đúng trạng thái trước khi nộp (REJECTED nếu lần nộp này theo sau 1 lần bị từ chối). */
    @Transactional
    public WeeklyTaskViews.Detail unsubmit(UUID id) {
        WeeklyTask t = requireAssignedTeacher(id);
        requireBeforeDeadline(t);
        if (t.reviewStatus() != WeeklyTaskReviewStatus.SUBMITTED) {
            throw new IllegalArgumentException("Chỉ có thể rút khi nhiệm vụ đang ở trạng thái đã nộp.");
        }
        WeeklyTaskReviewStatus reverted = t.rejectionReason() != null ? WeeklyTaskReviewStatus.REJECTED : WeeklyTaskReviewStatus.NOT_SUBMITTED;
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.grade(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.textbookCode(), t.chapterCode(), t.chapterName(), t.lessonCode(), t.lessonName(),
                t.deadline(), reverted, null, null, null, null, null, null,
                t.reviewedBy(), t.reviewedAt(), t.rejectionReason(), t.createdAt(), Instant.now(), t.version()));
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-86: hàng đợi duyệt — task SUBMITTED cùng subject với Moderator hiện tại, lọc thêm khối/chương/bài nếu có (BR-51/BR-53). */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Page listModerationQueue(int page, int size, Integer grade, String chapterCode, String lessonCode) {
        int resolvedPage = Math.max(0, page);
        int resolvedSize = Math.min(Math.max(1, size), 100);
        Page<WeeklyTask> result = repository.searchModerationQueue(requireSubject(), WeeklyTaskReviewStatus.SUBMITTED,
                grade, blankToNull(chapterCode), blankToNull(lessonCode),
                PageRequest.of(resolvedPage, resolvedSize, Sort.by("submittedAt").ascending().and(Sort.by("id").ascending())));
        Map<UUID, String> names = resolveNames(result.getContent());
        return new WeeklyTaskViews.Page(result.getContent().stream().map(t -> WeeklyTaskViews.toSummary(t, names)).toList(),
                resolvedPage, resolvedSize, result.getTotalElements());
    }

    /** UC-88: Moderator duyệt submission SUBMITTED cùng subject. */
    @Transactional
    public WeeklyTaskViews.Detail approve(UUID id) {
        WeeklyTask t = requireSubmittedInModeratorSubject(id);
        UUID moderatorId = currentUser.requireUserId();
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.grade(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.textbookCode(), t.chapterCode(), t.chapterName(), t.lessonCode(), t.lessonName(),
                t.deadline(), WeeklyTaskReviewStatus.APPROVED,
                t.sourceLibraryContentId(), t.sourceLibraryContentTitle(), t.sourceLibraryContentPayload(), t.sourceDocumentUrl(), t.sourceDocumentName(), t.submittedAt(),
                moderatorId, Instant.now(), null, t.createdAt(), Instant.now(), t.version()));
        notify(t.teacherId(), "Giáo án đã được duyệt", "Giáo án nộp cho nhiệm vụ \"" + t.scopeDescription() + "\" đã được duyệt.",
                TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        activityLogService.record(moderatorId, "MODERATOR", ActivityLogCategory.MODERATION,
                ActivityLogAction.APPROVE_WEEKLY_TASK, "WEEKLY_TASK", t.id(), null);
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-89: Moderator từ chối submission SUBMITTED cùng subject, bắt buộc lý do. */
    @Transactional
    public WeeklyTaskViews.Detail reject(UUID id, String rawReason) {
        if (rawReason == null || rawReason.isBlank()) {
            throw new IllegalArgumentException("Lý do từ chối là bắt buộc.");
        }
        WeeklyTask t = requireSubmittedInModeratorSubject(id);
        String reason = rawReason.trim();
        UUID moderatorId = currentUser.requireUserId();
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.grade(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.textbookCode(), t.chapterCode(), t.chapterName(), t.lessonCode(), t.lessonName(),
                t.deadline(), WeeklyTaskReviewStatus.REJECTED,
                t.sourceLibraryContentId(), t.sourceLibraryContentTitle(), t.sourceLibraryContentPayload(), t.sourceDocumentUrl(), t.sourceDocumentName(), t.submittedAt(),
                moderatorId, Instant.now(), reason, t.createdAt(), Instant.now(), t.version()));
        notify(t.teacherId(), "Giáo án bị từ chối", "Giáo án nộp cho nhiệm vụ \"" + t.scopeDescription() + "\" đã bị từ chối. Lý do: " + reason,
                TARGET_TYPE_TEACHER_SUBMIT, TARGET_URL_TEACHER_SUBMIT);
        activityLogService.record(moderatorId, "MODERATOR", ActivityLogCategory.MODERATION,
                ActivityLogAction.REJECT_WEEKLY_TASK, "WEEKLY_TASK", t.id(), reason);
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    private WeeklyTask requireVisible(UUID id) {
        WeeklyTask t = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhiệm vụ tuần."));
        AccessTokenClaims claims = currentUser.require();
        boolean isAssignedTeacher = t.teacherId().equals(claims.userId());
        boolean isModeratorInSubject = claims.roles().contains(Role.MODERATOR) && claims.subject() == t.subject();
        if (!isAssignedTeacher && !isModeratorInSubject) {
            throw new ForbiddenOperationException("Bạn không có quyền xem nhiệm vụ này.");
        }
        return t;
    }

    private WeeklyTask requireAssignedTeacher(UUID id) {
        WeeklyTask t = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhiệm vụ tuần."));
        if (!t.teacherId().equals(currentUser.requireUserId())) {
            throw new ForbiddenOperationException("Bạn chỉ có thể thao tác trên nhiệm vụ được giao cho mình.");
        }
        return t;
    }

    private WeeklyTask requireModeratorOwnerInSubject(UUID id) {
        WeeklyTask t = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhiệm vụ tuần."));
        if (t.subject() != requireSubject()) {
            throw new ForbiddenOperationException("Bạn chỉ có thể quản lý nhiệm vụ cùng môn.");
        }
        return t;
    }

    private WeeklyTask requireSubmittedInModeratorSubject(UUID id) {
        WeeklyTask t = repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhiệm vụ tuần."));
        if (t.reviewStatus() != WeeklyTaskReviewStatus.SUBMITTED) {
            throw new IllegalArgumentException("Chỉ có thể duyệt nhiệm vụ đang ở trạng thái đã nộp.");
        }
        if (t.subject() != requireSubject()) {
            throw new ForbiddenOperationException("Bạn chỉ có thể duyệt nhiệm vụ cùng môn.");
        }
        return t;
    }

    private void requireBeforeDeadline(WeeklyTask t) {
        if (Instant.now().isAfter(t.deadline())) {
            throw new IllegalArgumentException("Nhiệm vụ đã quá hạn nộp/chỉnh sửa.");
        }
    }

    /** BR-52: hạn nộp = 23:59:59 (giờ VN) Chủ Nhật của chính tuần {@code weekStartDate} (đã chuẩn hoá về Thứ Hai). */
    private static Instant computeDeadline(LocalDate mondayWeekStartDate) {
        return mondayWeekStartDate.plusDays(6).atTime(23, 59, 59).atZone(VN_ZONE).toInstant();
    }

    /** Chuẩn hoá 1 ngày bất kỳ về Thứ Hai của tuần chứa nó — weekStartDate luôn được lưu là Thứ Hai (BR-52). */
    private static LocalDate mondayOf(LocalDate date) {
        if (date == null) {
            throw new IllegalArgumentException("Tuần dạy là bắt buộc.");
        }
        return date.with(DayOfWeek.MONDAY);
    }

    private void requireWeekNotEnded(Instant computedDeadline) {
        if (!computedDeadline.isAfter(Instant.now())) {
            throw new IllegalArgumentException("Tuần này đã kết thúc, không thể tạo/sửa nhiệm vụ.");
        }
    }

    /** BR-51: giáo viên nhận task phải active, cùng subject, và có khối này trong teacher_grades. */
    private void requireActiveTeacherInSubjectAndGrade(UUID teacherId, Subject moderatorSubject, Integer grade) {
        AppUser teacher = userRepository.findById(teacherId).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo viên."));
        if (teacher.subject() != moderatorSubject) {
            throw new ForbiddenOperationException("Chỉ có thể giao nhiệm vụ cho giáo viên cùng môn.");
        }
        if (teacher.status() == UserStatus.DISABLED) {
            throw new IllegalArgumentException("Không thể giao nhiệm vụ cho giáo viên đang không hoạt động.");
        }
        if (!userRoleRepository.findRolesByUserId(teacherId).contains(Role.TEACHER)) {
            throw new IllegalArgumentException("Tài khoản được chọn không phải giáo viên.");
        }
        List<Integer> teacherGrades = teacherGradeRepository.findGradesByUserIds(List.of(teacherId)).getOrDefault(teacherId, List.of());
        if (!teacherGrades.contains(grade)) {
            throw new IllegalArgumentException("Giáo viên này không dạy khối " + grade + ".");
        }
    }

    private static Integer requireGrade(Integer grade) {
        if (grade == null || (grade != 10 && grade != 11 && grade != 12)) {
            throw new IllegalArgumentException("Khối chỉ được chọn 10, 11 hoặc 12.");
        }
        return grade;
    }

    /** BR-53: Chương/Bài phải chọn từ danh mục SGK thật (không phải mô tả tự do) — server resolve tên tại chỗ, không tin dữ liệu client gửi lên. */
    private record ResolvedLesson(String title, String textbookCode, String chapterCode, String chapterName, String lessonCode, String lessonName) {
        ResolvedLesson withTitle(String newTitle) {
            return new ResolvedLesson(newTitle, textbookCode, chapterCode, chapterName, lessonCode, lessonName);
        }
    }

    private ResolvedLesson resolveLesson(String textbookCode, String chapterCode, String lessonCode) {
        if (isBlank(textbookCode) || isBlank(chapterCode) || isBlank(lessonCode)) {
            throw new IllegalArgumentException("Phải chọn đủ Sách giáo khoa, Chương và Bài.");
        }
        String chapterName = textbookCatalogRepository.listChapters(textbookCode).stream()
                .filter(c -> c.id().equals(chapterCode))
                .map(TextbookCatalog.ChapterSummary::name)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy chương đã chọn trong sách giáo khoa."));
        String lessonName = textbookCatalogRepository.listLessons(textbookCode, chapterCode).stream()
                .filter(l -> l.id().equals(lessonCode))
                .map(TextbookCatalog.LessonSummary::name)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài đã chọn trong chương này."));
        return new ResolvedLesson(null, textbookCode, chapterCode, chapterName, lessonCode, lessonName);
    }

    /** BR-53: sách giáo khoa đã chọn phải thuộc đúng khối/môn — chặn Mod gửi mã sách của khối/môn khác. */
    private void requireBookMatchesGrade(String textbookCode, Subject subject, Integer grade) {
        boolean matches = textbookCatalogRepository.listBookNames(subject.name()).stream()
                .anyMatch(b -> b.id().equals(textbookCode) && b.grade() == grade);
        if (!matches) {
            throw new IllegalArgumentException("Sách giáo khoa không khớp với khối/môn đã chọn.");
        }
    }

    /**
     * BR-53: tối đa {@value #MAX_LESSONS_PER_WEEK} bài/tuần cho 1 (subject, grade); không được trùng
     * lessonCode với bài đã có trong tuần đó. {@code excludeTaskId} dùng khi sửa 1 task (bỏ qua chính nó
     * khi đếm/so trùng).
     */
    private void requireLessonSlotAvailable(Subject subject, Integer grade, LocalDate monday, List<String> newLessonCodes, UUID excludeTaskId) {
        requireLessonSlotAvailable(subject, grade, monday, newLessonCodes, excludeTaskId == null ? Set.of() : Set.of(excludeTaskId));
    }

    private void requireLessonSlotAvailable(Subject subject, Integer grade, LocalDate monday, List<String> newLessonCodes, Set<UUID> excludedTaskIds) {
        List<WeeklyTask> existing = repository.findBySubjectAndGrade(subject, grade, monday, monday).stream()
                .filter(t -> !excludedTaskIds.contains(t.id()))
                .toList();
        Set<String> existingLessonCodes = existing.stream().map(WeeklyTask::lessonCode).collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> distinctNew = new LinkedHashSet<>(newLessonCodes);
        for (String code : distinctNew) {
            if (existingLessonCodes.contains(code)) {
                throw new IllegalArgumentException("Bài này đã được giao trong tuần — sửa nhiệm vụ hiện có thay vì tạo lại.");
            }
        }
        if (existingLessonCodes.size() + distinctNew.size() > MAX_LESSONS_PER_WEEK) {
            throw new IllegalArgumentException("Mỗi tuần chỉ được tối đa " + MAX_LESSONS_PER_WEEK + " bài cho 1 khối.");
        }
    }

    private List<WeeklyTask> findAssignmentGroup(WeeklyTask anchor) {
        return repository.findBySubjectAndGrade(anchor.subject(), anchor.grade(), anchor.weekStartDate(), anchor.weekStartDate()).stream()
                .filter(task -> task.moderatorId().equals(anchor.moderatorId()))
                .filter(task -> task.textbookCode().equals(anchor.textbookCode()))
                .filter(task -> task.chapterCode().equals(anchor.chapterCode()))
                .filter(task -> task.lessonCode().equals(anchor.lessonCode()))
                .toList();
    }

    private WeeklyTask updateAssignmentFields(WeeklyTask task, LocalDate monday, String scope, ResolvedLesson lesson, Instant deadline) {
        return new WeeklyTask(task.id(), task.moderatorId(), task.subject(), task.grade(), task.teacherId(), monday, scope,
                lesson.textbookCode(), lesson.chapterCode(), lesson.chapterName(), lesson.lessonCode(), lesson.lessonName(), deadline,
                task.reviewStatus(), task.sourceLibraryContentId(), task.sourceLibraryContentTitle(), task.sourceLibraryContentPayload(), task.sourceDocumentUrl(), task.sourceDocumentName(),
                task.submittedAt(), task.reviewedBy(), task.reviewedAt(), task.rejectionReason(), task.createdAt(), Instant.now(), task.version());
    }

    private WeeklyTask resetForReassignedTeacher(WeeklyTask task, UUID teacherId, LocalDate monday, String scope, ResolvedLesson lesson, Instant deadline) {
        return new WeeklyTask(task.id(), task.moderatorId(), task.subject(), task.grade(), teacherId, monday, scope,
                lesson.textbookCode(), lesson.chapterCode(), lesson.chapterName(), lesson.lessonCode(), lesson.lessonName(), deadline,
                WeeklyTaskReviewStatus.NOT_SUBMITTED, null, null, null, null, null, null, null, null, null, task.createdAt(), Instant.now(), task.version());
    }

    private static WeeklyTask copyForTeacher(WeeklyTask template, UUID teacherId, Instant now) {
        return new WeeklyTask(UUID.randomUUID(), template.moderatorId(), template.subject(), template.grade(), teacherId,
                template.weekStartDate(), template.scopeDescription(), template.textbookCode(), template.chapterCode(),
                template.chapterName(), template.lessonCode(), template.lessonName(), template.deadline(),
                WeeklyTaskReviewStatus.NOT_SUBMITTED, null, null, null, null, null, null, null, null, null, now, now, null);
    }

    private static String assignmentKey(WeeklyTask task) {
        return task.textbookCode() + "|" + task.chapterCode() + "|" + task.lessonCode();
    }

    private Subject requireSubject() {
        Subject subject = currentUser.require().subject();
        if (subject == null) {
            throw new ForbiddenOperationException("Tài khoản phải có subject để thao tác với Weekly Task.");
        }
        return subject;
    }

    private static String requireScope(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Tiêu đề là bắt buộc.");
        }
        return raw.trim();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String blankToNull(String s) {
        return s != null && !s.isBlank() ? s.trim() : null;
    }

    private Map<UUID, String> resolveNames(List<WeeklyTask> tasks) {
        List<UUID> ids = tasks.stream()
                .flatMap(t -> Stream.of(t.moderatorId(), t.teacherId(), t.reviewedBy()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return userRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(AppUser::id, WeeklyTaskService::displayName));
    }

    private void notify(UUID recipientId, String title, String content, String targetType, String targetUrl) {
        UUID senderId = currentUser.requireUserId();
        Subject subject = requireSubject();
        Instant now = Instant.now();
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, subject, title, content, now, targetType, targetUrl), List.of(recipientId));
        String senderName = userRepository.findById(senderId).map(WeeklyTaskService::displayName).orElse(null);
        streamPort.publishNew(recipientId,
                new NotificationEvent(saved.id(), saved.title(), saved.content(), saved.subject(), senderName,
                        saved.createdAt(), saved.targetType(), saved.targetUrl()));
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
