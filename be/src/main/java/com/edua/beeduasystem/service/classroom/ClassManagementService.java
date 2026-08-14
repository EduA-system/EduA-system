package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ClassAccessRevokedException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.SubmissionRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class ClassManagementService {

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassResourceRepository classResourceRepository;
    private final SubmissionRepository submissionRepository;
    private final AppUserRepository userRepository;
    private final TeacherGradeRepository teacherGradeRepository;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationRepository notificationRepository;
    private final NotificationStreamPort notificationStreamPort;

    public ClassManagementService(ClassRepository classRepository,
                                  ClassMemberRepository classMemberRepository,
                                  ClassResourceRepository classResourceRepository,
                                  SubmissionRepository submissionRepository,
                                  AppUserRepository userRepository,
                                  TeacherGradeRepository teacherGradeRepository,
                                  CurrentUserProvider currentUserProvider,
                                  NotificationRepository notificationRepository,
                                  NotificationStreamPort notificationStreamPort) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.classResourceRepository = classResourceRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.teacherGradeRepository = teacherGradeRepository;
        this.currentUserProvider = currentUserProvider;
        this.notificationRepository = notificationRepository;
        this.notificationStreamPort = notificationStreamPort;
    }

    @Transactional(readOnly = true)
    public ClassViews.Page<ClassViews.ClassSummary> listOwnedClasses(Subject subject, Integer grade, ClassStatus status, String q, int page, int size) {
        UUID ownerId = currentUserProvider.requireUserId();
        ClassRepository.SearchResult result = classRepository.searchOwned(ownerId, subject, grade, status, q, page, size);
        List<ClassViews.ClassSummary> items = result.items().stream()
                .map(this::toSummary)
                .toList();
        return new ClassViews.Page<>(items, page, size, result.total());
    }

    @Transactional(readOnly = true)
    public ClassViews.Page<ClassViews.ClassSummary> listEnrolledClasses(Subject subject, Integer grade, ClassStatus status, String q, int page, int size) {
        UUID studentId = currentUserProvider.requireUserId();
        ClassRepository.SearchResult result = classRepository.searchEnrolled(studentId, subject, grade, status, q, page, size);
        List<ClassViews.ClassSummary> items = result.items().stream()
                .map(this::toSummary)
                .toList();
        return new ClassViews.Page<>(items, page, size, result.total());
    }

    @Transactional
    public ClassViews.ClassDetail createClass(String name, Subject subject, Integer grade, String description) {
        UUID ownerId = currentUserProvider.requireUserId();
        Subject requestedSubject = requireSubject(subject);
        requireOwnSubject(requestedSubject);
        Integer requestedGrade = requireGrade(grade);
        requireOwnGrade(ownerId, requestedGrade);
        Classroom saved = classRepository.save(new Classroom(
                UUID.randomUUID(),
                ownerId,
                requireName(name),
                normalizeDescription(description),
                requestedSubject,
                requestedGrade,
                ClassStatus.ACTIVE,
                Instant.now(),
                Instant.now()));
        return toDetail(saved);
    }

    @Transactional(readOnly = true)
    public ClassViews.ClassDetail getDetail(UUID id) {
        return toDetail(requireAccessibleClass(id));
    }

    @Transactional
    public ClassViews.ClassDetail updateClass(UUID id, String name, Subject subject, Integer grade, String description) {
        Classroom classroom = requireOwnedActiveClass(id);
        String newName = name != null ? requireName(name) : classroom.name();
        Subject newSubject = subject != null ? requireSubject(subject) : classroom.subject();
        if (subject != null) {
            requireOwnSubject(newSubject);
        }
        Integer newGrade = grade != null ? requireGrade(grade) : classroom.grade();
        requireOwnGrade(classroom.ownerId(), newGrade);
        String newDescription = description != null ? normalizeDescription(description) : classroom.description();
        Classroom saved = classRepository.save(new Classroom(
                classroom.id(),
                classroom.ownerId(),
                newName,
                newDescription,
                newSubject,
                newGrade,
                classroom.status(),
                classroom.createdAt(),
                Instant.now()));
        notifyClassUpdated(classroom, saved);
        return toDetail(saved);
    }

    @Transactional
    public ClassViews.ClassDetail updateStatus(UUID id, ClassStatus status) {
        Classroom classroom = requireOwnedClass(id);
        ClassStatus newStatus = requireStatus(status);
        if (classroom.status() == newStatus) {
            throw new IllegalArgumentException("Class already has status " + newStatus + ".");
        }
        Classroom saved = classRepository.save(new Classroom(
                classroom.id(),
                classroom.ownerId(),
                classroom.name(),
                classroom.description(),
                classroom.subject(),
                classroom.grade(),
                newStatus,
                classroom.createdAt(),
                Instant.now()));
        return toDetail(saved);
    }

    // ---- notification (BR-46): bao cho hoc sinh trong lop khi thong tin lop thay doi ----

    /** Chi gui khi co truong hien thi voi hoc sinh thuc su doi (ten/mon/khoi/mo ta). */
    private void notifyClassUpdated(Classroom before, Classroom after) {
        List<String> changes = describeChanges(before, after);
        if (changes.isEmpty()) {
            return;
        }
        List<UUID> studentIds = classMemberRepository.findAllStudentIds(after.id());
        if (studentIds.isEmpty()) {
            return;
        }
        UUID senderId = currentUserProvider.requireUserId();
        String title = "Lớp " + after.name() + " đã được cập nhật";
        String content = "Giáo viên đã cập nhật " + String.join(", ", changes)
                + " của lớp \"" + after.name() + "\".";
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, after.subject(), title, content, Instant.now(),
                        "CLASS", "/class-detail?classId=" + after.id()),
                studentIds);
        NotificationEvent event = new NotificationEvent(
                saved.id(), saved.title(), saved.content(), saved.subject(), resolveOwnerName(senderId),
                saved.createdAt(), saved.targetType(), saved.targetUrl());
        studentIds.forEach(studentId -> notificationStreamPort.publishNew(studentId, event));
    }

    private static List<String> describeChanges(Classroom before, Classroom after) {
        List<String> changes = new ArrayList<>();
        if (!Objects.equals(before.name(), after.name())) {
            changes.add("tên lớp (\"" + before.name() + "\" → \"" + after.name() + "\")");
        }
        if (before.subject() != after.subject()) {
            changes.add("môn học");
        }
        if (!Objects.equals(before.grade(), after.grade())) {
            changes.add("khối");
        }
        if (!Objects.equals(before.description(), after.description())) {
            changes.add("mô tả");
        }
        return changes;
    }

    private ClassViews.ClassSummary toSummary(Classroom classroom) {
        long memberCount = 1L + classMemberRepository.countByClassId(classroom.id());
        return new ClassViews.ClassSummary(
                classroom.id(),
                classroom.name(),
                classroom.subject(),
                classroom.grade(),
                memberCount,
                classroom.status(),
                classroom.createdAt(),
                classroom.updatedAt());
    }

    private ClassViews.ClassDetail toDetail(Classroom classroom) {
        long memberCount = 1L + classMemberRepository.countByClassId(classroom.id());
        long resourceCount = classResourceRepository.countByClassId(classroom.id());
        long assignmentCount = classResourceRepository.countAssignmentsByClassId(classroom.id());
        long submissionCount = submissionRepository.countByClassId(classroom.id());
        String ownerName = resolveOwnerName(classroom.ownerId());
        return new ClassViews.ClassDetail(
                classroom.id(),
                classroom.name(),
                classroom.description(),
                classroom.subject(),
                classroom.grade(),
                classroom.status(),
                classroom.ownerId(),
                ownerName,
                memberCount,
                resourceCount,
                assignmentCount,
                submissionCount,
                classroom.createdAt(),
                classroom.updatedAt());
    }

    private Classroom requireAccessibleClass(UUID id) {
        Classroom classroom = requireClass(id);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (classroom.isOwnedBy(currentUserId) || classMemberRepository.existsByClassIdAndStudentId(id, currentUserId)) {
            return classroom;
        }
        throw new ClassAccessRevokedException();
    }

    private Classroom requireOwnedClass(UUID id) {
        Classroom classroom = requireClass(id);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (!classroom.isOwnedBy(currentUserId)) {
            throw new ForbiddenOperationException("You can only manage your own class.");
        }
        return classroom;
    }

    private Classroom requireOwnedActiveClass(UUID id) {
        Classroom classroom = requireOwnedClass(id);
        if (!classroom.isActive()) {
            throw new ForbiddenOperationException("Class is inactive and read-only.");
        }
        return classroom;
    }

    private Classroom requireClass(UUID id) {
        return classRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
    }

    private String resolveOwnerName(UUID ownerId) {
        return userRepository.findById(ownerId)
                .map(this::displayName)
                .orElse(null);
    }

    private String displayName(AppUser user) {
        return StringUtils.hasText(user.fullName()) ? user.fullName().trim() : user.email();
    }

    private static String requireName(String name) {
        if (!StringUtils.hasText(name)) {
            throw new IllegalArgumentException("Name is required.");
        }
        String trimmed = name.trim();
        if (trimmed.length() > 255) {
            throw new IllegalArgumentException("Name must be at most 255 characters.");
        }
        return trimmed;
    }

    private static String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        if (trimmed.length() > 2000) {
            throw new IllegalArgumentException("Description must be at most 2000 characters.");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static Subject requireSubject(Subject subject) {
        if (subject == null) {
            throw new IllegalArgumentException("Subject is required.");
        }
        return subject;
    }

    private void requireOwnSubject(Subject requestedSubject) {
        Subject ownerSubject = currentUserProvider.require().subject();
        if (ownerSubject == null || ownerSubject != requestedSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ được tạo hoặc chỉnh sửa lớp thuộc chuyên ngành của mình.");
        }
    }

    private static Integer requireGrade(Integer grade) {
        if (grade == null) {
            throw new IllegalArgumentException("Grade is required.");
        }
        if (grade < 10 || grade > 12) {
            throw new IllegalArgumentException("Grade must be between 10 and 12.");
        }
        return grade;
    }

    private void requireOwnGrade(UUID teacherId, Integer grade) {
        List<Integer> assignedGrades = teacherGradeRepository
                .findGradesByUserIds(List.of(teacherId))
                .getOrDefault(teacherId, List.of());
        if (!assignedGrades.contains(grade)) {
            throw new ForbiddenOperationException("Bạn chỉ được tạo hoặc chỉnh sửa lớp thuộc khối mình phụ trách.");
        }
    }

    private static ClassStatus requireStatus(ClassStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status is required.");
        }
        return status;
    }
}
