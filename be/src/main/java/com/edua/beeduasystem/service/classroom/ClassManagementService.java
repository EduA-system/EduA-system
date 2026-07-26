package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ClassManagementService {

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public ClassManagementService(ClassRepository classRepository,
                                  ClassMemberRepository classMemberRepository,
                                  AppUserRepository userRepository,
                                  CurrentUserProvider currentUserProvider) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
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
        Classroom saved = classRepository.save(new Classroom(
                UUID.randomUUID(),
                ownerId,
                requireName(name),
                normalizeDescription(description),
                requireSubject(subject),
                requireGrade(grade),
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
        Integer newGrade = grade != null ? requireGrade(grade) : classroom.grade();
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
                0L,
                0L,
                0L,
                classroom.createdAt(),
                classroom.updatedAt());
    }

    private Classroom requireAccessibleClass(UUID id) {
        Classroom classroom = requireClass(id);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (classroom.isOwnedBy(currentUserId) || classMemberRepository.existsByClassIdAndStudentId(id, currentUserId)) {
            return classroom;
        }
        throw new ForbiddenOperationException("You do not have access to this class.");
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

    private static Integer requireGrade(Integer grade) {
        if (grade == null) {
            throw new IllegalArgumentException("Grade is required.");
        }
        if (grade < 10 || grade > 12) {
            throw new IllegalArgumentException("Grade must be between 10 and 12.");
        }
        return grade;
    }

    private static ClassStatus requireStatus(ClassStatus status) {
        if (status == null) {
            throw new IllegalArgumentException("Status is required.");
        }
        return status;
    }
}
