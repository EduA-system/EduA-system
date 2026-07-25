package com.edua.beeduasystem.service.weeklytask;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTask;
import com.edua.beeduasystem.domain.model.weeklytask.WeeklyTaskReviewStatus;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.repository.repositories.WeeklyTaskRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Use-case Weekly Task (UC-80..89): Moderator giao yêu cầu giáo án cho Teacher cùng subject, kèm hạn nộp;
 * Teacher nộp/nộp lại/rút giáo án; Moderator duyệt. {@code reviewStatus} tách biệt hoàn toàn với
 * Publish Status (Hub) trên {@code LibraryContent}.
 */
@Service
public class WeeklyTaskService {

    private static final DateTimeFormatter DEADLINE_FMT =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final WeeklyTaskRepository repository;
    private final LibraryContentRepository libraryContentRepository;
    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUser;
    private final NotificationRepository notificationRepository;
    private final NotificationStreamPort streamPort;

    public WeeklyTaskService(WeeklyTaskRepository repository, LibraryContentRepository libraryContentRepository,
                              AppUserRepository userRepository, UserRoleRepository userRoleRepository,
                              CurrentUserProvider currentUser, NotificationRepository notificationRepository,
                              NotificationStreamPort streamPort) {
        this.repository = repository;
        this.libraryContentRepository = libraryContentRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUser = currentUser;
        this.notificationRepository = notificationRepository;
        this.streamPort = streamPort;
    }

    /** UC-80: lịch tuần theo scope của current user (Teacher: của mình; Moderator: cả subject). */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Schedule schedule(LocalDate from, LocalDate to) {
        AccessTokenClaims claims = currentUser.require();
        List<WeeklyTask> tasks = claims.roles().contains(Role.MODERATOR)
                ? repository.findBySubject(requireSubject(), from, to)
                : repository.findByTeacher(claims.userId(), from, to);
        return WeeklyTaskViews.toSchedule(tasks, resolveNames(tasks));
    }

    /** UC-83 (Teacher) / UC-87 (Moderator): xem chi tiết 1 task — cả 2 role dùng chung endpoint. */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Detail get(UUID id) {
        WeeklyTask t = requireVisible(id);
        return WeeklyTaskViews.toDetail(t, resolveNames(List.of(t)));
    }

    /** UC-81: Moderator giao task cho 1 Teacher Active cùng subject. */
    @Transactional
    public WeeklyTaskViews.Detail create(UUID teacherId, LocalDate weekStartDate, String rawScope, Instant deadline) {
        Subject moderatorSubject = requireSubject();
        String scope = requireScope(rawScope);
        requireFutureDeadline(deadline);
        requireActiveTeacherInSubject(teacherId, moderatorSubject);
        Instant now = Instant.now();
        WeeklyTask saved = repository.save(new WeeklyTask(UUID.randomUUID(), currentUser.requireUserId(), moderatorSubject,
                teacherId, weekStartDate, scope, deadline, WeeklyTaskReviewStatus.NOT_SUBMITTED,
                null, null, null, null, null, null, null, now, now));
        notify(teacherId, "Nhiệm vụ tuần mới", "Bạn được giao soạn: " + scope + ". Hạn nộp: " + DEADLINE_FMT.format(deadline) + ".");
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-82: Moderator sửa task còn hạn (BR-47); đổi Teacher sẽ reset reviewStatus vì người mới chưa nộp gì. */
    @Transactional
    public WeeklyTaskViews.Detail update(UUID id, UUID teacherId, LocalDate weekStartDate, String rawScope, Instant deadline) {
        WeeklyTask t = requireModeratorOwnerInSubject(id);
        requireBeforeDeadline(t);
        String scope = requireScope(rawScope);
        requireFutureDeadline(deadline);
        boolean reassigned = !teacherId.equals(t.teacherId());
        if (reassigned) {
            requireActiveTeacherInSubject(teacherId, t.subject());
        }
        WeeklyTask updated = reassigned
                ? new WeeklyTask(t.id(), t.moderatorId(), t.subject(), teacherId, weekStartDate, scope, deadline,
                        WeeklyTaskReviewStatus.NOT_SUBMITTED, null, null, null, null, null, null, null, t.createdAt(), Instant.now())
                : new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.teacherId(), weekStartDate, scope, deadline,
                        t.reviewStatus(), t.sourceLibraryContentId(), t.sourceDocumentUrl(), t.sourceDocumentName(),
                        t.submittedAt(), t.reviewedBy(), t.reviewedAt(), t.rejectionReason(), t.createdAt(), Instant.now());
        WeeklyTask saved = repository.save(updated);
        if (reassigned) {
            notify(t.teacherId(), "Nhiệm vụ tuần đã được chuyển", "Nhiệm vụ \"" + scope + "\" đã được chuyển cho giáo viên khác.");
            notify(teacherId, "Nhiệm vụ tuần mới", "Bạn được giao soạn: " + scope + ". Hạn nộp: " + DEADLINE_FMT.format(deadline) + ".");
        } else {
            notify(t.teacherId(), "Nhiệm vụ tuần đã được cập nhật", "Nhiệm vụ \"" + scope + "\" đã được chỉnh sửa. Hạn nộp mới: " + DEADLINE_FMT.format(deadline) + ".");
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
        if (hasLibraryContent) {
            LibraryContent c = libraryContentRepository.findActiveById(libraryContentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo án."));
            if (!c.ownerId().equals(currentUser.requireUserId())) {
                throw new ForbiddenOperationException("Bạn chỉ có thể nộp giáo án của chính mình.");
            }
            if (c.type() != LibraryContentType.LESSON_PLAN) {
                throw new IllegalArgumentException("Chỉ có thể nộp nội dung loại giáo án (LESSON_PLAN).");
            }
        }
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.deadline(), WeeklyTaskReviewStatus.SUBMITTED,
                hasLibraryContent ? libraryContentId : null, hasDocument ? documentUrl.trim() : null,
                hasDocument ? (documentName == null ? null : documentName.trim()) : null, Instant.now(),
                t.reviewedBy(), t.reviewedAt(), t.rejectionReason(), t.createdAt(), Instant.now()));
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
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.deadline(), reverted, null, null, null, null,
                t.reviewedBy(), t.reviewedAt(), t.rejectionReason(), t.createdAt(), Instant.now()));
        return WeeklyTaskViews.toDetail(saved, resolveNames(List.of(saved)));
    }

    /** UC-86: hàng đợi duyệt — task SUBMITTED cùng subject với Moderator hiện tại. */
    @Transactional(readOnly = true)
    public WeeklyTaskViews.Page listModerationQueue(int page, int size) {
        Page<WeeklyTask> result = repository.findBySubjectAndStatus(requireSubject(), WeeklyTaskReviewStatus.SUBMITTED,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        Map<UUID, String> names = resolveNames(result.getContent());
        return new WeeklyTaskViews.Page(result.getContent().stream().map(t -> WeeklyTaskViews.toSummary(t, names)).toList(),
                page, size, result.getTotalElements());
    }

    /** UC-88: Moderator duyệt submission SUBMITTED cùng subject. */
    @Transactional
    public WeeklyTaskViews.Detail approve(UUID id) {
        WeeklyTask t = requireSubmittedInModeratorSubject(id);
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.deadline(), WeeklyTaskReviewStatus.APPROVED,
                t.sourceLibraryContentId(), t.sourceDocumentUrl(), t.sourceDocumentName(), t.submittedAt(),
                currentUser.requireUserId(), Instant.now(), null, t.createdAt(), Instant.now()));
        notify(t.teacherId(), "Giáo án đã được duyệt", "Giáo án nộp cho nhiệm vụ \"" + t.scopeDescription() + "\" đã được duyệt.");
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
        WeeklyTask saved = repository.save(new WeeklyTask(t.id(), t.moderatorId(), t.subject(), t.teacherId(),
                t.weekStartDate(), t.scopeDescription(), t.deadline(), WeeklyTaskReviewStatus.REJECTED,
                t.sourceLibraryContentId(), t.sourceDocumentUrl(), t.sourceDocumentName(), t.submittedAt(),
                currentUser.requireUserId(), Instant.now(), reason, t.createdAt(), Instant.now()));
        notify(t.teacherId(), "Giáo án bị từ chối", "Giáo án nộp cho nhiệm vụ \"" + t.scopeDescription() + "\" đã bị từ chối. Lý do: " + reason);
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

    private void requireFutureDeadline(Instant deadline) {
        if (deadline == null || !deadline.isAfter(Instant.now())) {
            throw new IllegalArgumentException("Hạn nộp phải ở trong tương lai.");
        }
    }

    private void requireActiveTeacherInSubject(UUID teacherId, Subject moderatorSubject) {
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
            throw new IllegalArgumentException("Yêu cầu giáo án là bắt buộc.");
        }
        return raw.trim();
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

    private void notify(UUID recipientId, String title, String content) {
        UUID senderId = currentUser.requireUserId();
        Subject subject = requireSubject();
        Instant now = Instant.now();
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, subject, title, content, now), List.of(recipientId));
        String senderName = userRepository.findById(senderId).map(WeeklyTaskService::displayName).orElse(null);
        streamPort.publishNew(recipientId,
                new NotificationEvent(saved.id(), saved.title(), saved.content(), saved.subject(), senderName, saved.createdAt()));
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
