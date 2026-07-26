package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.classroom.ClassResource;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case View Class Resources (UC-41): Student (hoac owner Teacher) xem danh sach resource da
 * duoc dang trong 1 lop. Xem thiet ke: designs/API_designs/view-class-resources.md.
 */
@Service
public class ClassResourceService {

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassResourceRepository classResourceRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;

    public ClassResourceService(ClassRepository classRepository,
                                ClassMemberRepository classMemberRepository,
                                ClassResourceRepository classResourceRepository,
                                AppUserRepository userRepository,
                                CurrentUserProvider currentUserProvider) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.classResourceRepository = classResourceRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
    }

    @Transactional(readOnly = true)
    public ClassResourceViews.Page listResources(UUID classId, int page, int size) {
        // BR-39: doc duoc ca khi lop INACTIVE, khong check status nhu cac thao tac ghi.
        requireAccessibleClass(classId);
        ClassResourceRepository.PageResult result = classResourceRepository.findByClassId(classId, page, size);
        return new ClassResourceViews.Page(toSummaries(result.items()), page, size, result.total());
    }

    private List<ClassResourceViews.ResourceSummary> toSummaries(List<ClassResource> resources) {
        if (resources.isEmpty()) {
            return List.of();
        }
        Map<UUID, AppUser> postersById = userRepository.findAllById(
                        resources.stream().map(ClassResource::postedBy).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::id, u -> u));
        return resources.stream().map(r -> toSummary(r, postersById.get(r.postedBy()))).toList();
    }

    private static ClassResourceViews.ResourceSummary toSummary(ClassResource resource, AppUser poster) {
        return new ClassResourceViews.ResourceSummary(
                resource.id(),
                resource.title(),
                resource.description(),
                resource.sourceType(),
                resource.thumbnailUrl(),
                toAttachment(resource),
                resource.submissionEnabled(),
                resource.deadline(),
                poster != null ? (StringUtils.hasText(poster.fullName()) ? poster.fullName() : poster.email()) : null,
                resource.createdAt(),
                resource.submissionEnabled() ? SubmissionStatus.NOT_SUBMITTED : SubmissionStatus.NOT_APPLICABLE);
    }

    private static ClassResourceViews.Attachment toAttachment(ClassResource resource) {
        if (!resource.hasAttachment()) {
            return null;
        }
        return new ClassResourceViews.Attachment(
                resource.attachmentFileName(),
                resource.attachmentUrl(),
                resource.attachmentContentType(),
                resource.attachmentSizeBytes());
    }

    // ---- access guard (owner/enrollment check, doc lap voi ClassManagementService/ClassEnrollmentService) ----

    private Classroom requireAccessibleClass(UUID classId) {
        Classroom classroom = requireClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (classroom.isOwnedBy(currentUserId) || classMemberRepository.existsByClassIdAndStudentId(classId, currentUserId)) {
            return classroom;
        }
        throw new ForbiddenOperationException("You do not have access to this class.");
    }

    private Classroom requireClass(UUID classId) {
        return classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
    }
}
