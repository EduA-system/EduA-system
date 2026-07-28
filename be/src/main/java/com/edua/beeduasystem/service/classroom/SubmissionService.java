package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.classroom.ClassResource;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.classroom.Submission;
import com.edua.beeduasystem.domain.model.classroom.SubmissionFile;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import com.edua.beeduasystem.repository.repositories.SubmissionRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case Submit/Unsubmit Assignment (UC-47/48, phia Student) + xem lai bai da nop (ngoai SRS,
 * can thiet cho FE), cong voi Teacher xem danh sach/chi tiet bai nop (UC-44/45). Xem thiet ke:
 * designs/API_designs/submit-assignment.md, designs/submit-assignment/flow.md,
 * designs/API_designs/review-submissions.md, designs/review-submissions/flow.md.
 */
@Service
public class SubmissionService {

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassResourceRepository classResourceRepository;
    private final SubmissionRepository submissionRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final BlogContentSanitizer sanitizer;

    public SubmissionService(ClassRepository classRepository,
                              ClassMemberRepository classMemberRepository,
                              ClassResourceRepository classResourceRepository,
                              SubmissionRepository submissionRepository,
                              AppUserRepository userRepository,
                              CurrentUserProvider currentUserProvider,
                              BlogContentSanitizer sanitizer) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.classResourceRepository = classResourceRepository;
        this.submissionRepository = submissionRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.sanitizer = sanitizer;
    }

    @Transactional
    public SubmissionViews.Detail submit(UUID classId, UUID resourceId, String rawTextContent,
            List<SubmissionViews.FileInput> fileInputs) {
        requireEnrolledActiveClass(classId);
        UUID studentId = currentUserProvider.requireUserId();
        ClassResource resource = requireSubmittableResource(classId, resourceId);

        String sanitizedText = rawTextContent != null ? sanitizer.sanitize(rawTextContent) : null;
        boolean hasText = sanitizedText != null && !sanitizer.isEmpty(sanitizedText);
        List<SubmissionViews.FileInput> files = fileInputs != null ? fileInputs : List.of();
        if (!hasText && files.isEmpty()) {
            throw new IllegalArgumentException("Submission must include text content or at least one file.");
        }

        Instant now = Instant.now();
        SubmissionStatus status = !now.isAfter(resource.deadline()) ? SubmissionStatus.ON_TIME : SubmissionStatus.LATE;

        Submission submission = new Submission(
                UUID.randomUUID(), resourceId, studentId, hasText ? sanitizedText : null, status, now, now, now);
        List<SubmissionFile> submissionFiles = files.stream()
                .map(file -> new SubmissionFile(UUID.randomUUID(), null, file.url(), file.fileName(),
                        file.contentType(), file.sizeBytes()))
                .toList();

        SubmissionRepository.SubmissionWithFiles saved = submissionRepository.upsert(submission, submissionFiles);
        return toDetail(saved);
    }

    @Transactional
    public void unsubmit(UUID classId, UUID resourceId) {
        requireEnrolledActiveClass(classId);
        UUID studentId = currentUserProvider.requireUserId();
        requireClassResource(classId, resourceId);
        submissionRepository.findByResourceAndStudent(resourceId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No active submission to withdraw."));
        submissionRepository.deleteByResourceAndStudent(resourceId, studentId);
    }

    @Transactional(readOnly = true)
    public SubmissionViews.Detail getOwnSubmission(UUID classId, UUID resourceId) {
        requireEnrolledClass(classId);
        UUID studentId = currentUserProvider.requireUserId();
        requireClassResource(classId, resourceId);
        SubmissionRepository.SubmissionWithFiles found = submissionRepository.findByResourceAndStudent(resourceId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No submission found."));
        return toDetail(found);
    }

    @Transactional(readOnly = true)
    public SubmissionViews.Roster listSubmissions(UUID classId, UUID resourceId) {
        requireOwnedClass(classId);
        ClassResource resource = requireSubmittableResource(classId, resourceId);

        List<UUID> studentIds = classMemberRepository.findAllStudentIds(classId);
        Map<UUID, AppUser> usersById = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(AppUser::id, u -> u));
        Map<UUID, SubmissionRepository.SubmissionWithFiles> submissionsByStudent = submissionRepository
                .findAllByResource(resourceId).stream()
                .collect(Collectors.toMap(s -> s.submission().studentId(), s -> s));

        List<SubmissionViews.RosterEntry> items = studentIds.stream()
                .map(studentId -> toRosterEntry(studentId, usersById.get(studentId), submissionsByStudent.get(studentId)))
                .sorted(Comparator.comparing(SubmissionViews.RosterEntry::studentName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();

        return new SubmissionViews.Roster(resourceId, resource.deadline(), items);
    }

    @Transactional(readOnly = true)
    public SubmissionViews.TeacherDetail getSubmissionDetail(UUID classId, UUID resourceId, UUID studentId) {
        requireOwnedClass(classId);
        requireClassResource(classId, resourceId);
        SubmissionRepository.SubmissionWithFiles found = submissionRepository
                .findByResourceAndStudent(resourceId, studentId)
                .orElseThrow(() -> new ResourceNotFoundException("No submission found for this student."));

        List<SubmissionViews.FileDetail> files = found.files().stream()
                .map(file -> new SubmissionViews.FileDetail(file.fileName(), file.url(), file.contentType(), file.sizeBytes()))
                .toList();
        return new SubmissionViews.TeacherDetail(
                studentId,
                resolveDisplayName(userRepository.findById(studentId).orElse(null)),
                found.submission().textContent(),
                files,
                found.submission().status(),
                found.submission().createdAt(),
                found.submission().submittedAt());
    }

    private static SubmissionViews.RosterEntry toRosterEntry(
            UUID studentId, AppUser student, SubmissionRepository.SubmissionWithFiles submission) {
        String name = resolveDisplayName(student);
        String email = student != null ? student.email() : null;
        if (submission == null) {
            return new SubmissionViews.RosterEntry(studentId, name, email, SubmissionStatus.NOT_SUBMITTED, null, null);
        }
        return new SubmissionViews.RosterEntry(
                studentId, name, email, submission.submission().status(),
                submission.submission().createdAt(), submission.submission().submittedAt());
    }

    private static String resolveDisplayName(AppUser user) {
        if (user == null) {
            return null;
        }
        return StringUtils.hasText(user.fullName()) ? user.fullName() : user.email();
    }

    private static SubmissionViews.Detail toDetail(SubmissionRepository.SubmissionWithFiles saved) {
        List<SubmissionViews.FileDetail> files = saved.files().stream()
                .map(file -> new SubmissionViews.FileDetail(file.fileName(), file.url(), file.contentType(), file.sizeBytes()))
                .toList();
        return new SubmissionViews.Detail(
                saved.submission().id(),
                saved.submission().textContent(),
                files,
                saved.submission().status(),
                saved.submission().submittedAt());
    }

    private ClassResource requireSubmittableResource(UUID classId, UUID resourceId) {
        ClassResource resource = requireClassResource(classId, resourceId);
        if (!resource.submissionEnabled()) {
            throw new ForbiddenOperationException("This resource does not accept submissions.");
        }
        return resource;
    }

    private ClassResource requireClassResource(UUID classId, UUID resourceId) {
        ClassResource resource = classResourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Class resource not found."));
        if (!resource.classId().equals(classId)) {
            throw new ResourceNotFoundException("Class resource not found.");
        }
        return resource;
    }

    // ---- access guard (owner - Teacher xem danh sach/chi tiet bai nop, UC-44/45) ----

    private Classroom requireOwnedClass(UUID classId) {
        Classroom classroom = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
        UUID currentUserId = currentUserProvider.requireUserId();
        if (!classroom.isOwnedBy(currentUserId)) {
            throw new ForbiddenOperationException("Only the class owner can view student submissions.");
        }
        return classroom;
    }

    // ---- access guard (enrolled student, khong phai owner - khac ClassResourceService) ----

    private Classroom requireEnrolledActiveClass(UUID classId) {
        Classroom classroom = requireEnrolledClass(classId);
        if (!classroom.isActive()) {
            throw new ForbiddenOperationException("Class is inactive and read-only.");
        }
        return classroom;
    }

    private Classroom requireEnrolledClass(UUID classId) {
        Classroom classroom = classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
        UUID currentUserId = currentUserProvider.requireUserId();
        if (classroom.isOwnedBy(currentUserId) || !classMemberRepository.existsByClassIdAndStudentId(classId, currentUserId)) {
            throw new ForbiddenOperationException("Only enrolled students can submit assignments for this class.");
        }
        return classroom;
    }
}
