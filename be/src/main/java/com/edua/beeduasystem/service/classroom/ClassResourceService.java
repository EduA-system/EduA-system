package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.classroom.ClassResource;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.classroom.ResourceSourceType;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.SubmissionRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case Class Resources: UC-41 View (Student/Teacher doc), UC-38 Post / UC-39 Update / UC-40
 * Delete (Teacher ghi). Xem thiet ke: designs/API_designs/view-class-resources.md,
 * designs/API_designs/manage-class-resources.md.
 */
@Service
public class ClassResourceService {

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ClassResourceRepository classResourceRepository;
    private final LibraryContentRepository libraryContentRepository;
    private final AppUserRepository userRepository;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationRepository notificationRepository;
    private final NotificationStreamPort notificationStreamPort;
    private final SubmissionRepository submissionRepository;

    public ClassResourceService(ClassRepository classRepository,
                                ClassMemberRepository classMemberRepository,
                                ClassResourceRepository classResourceRepository,
                                LibraryContentRepository libraryContentRepository,
                                AppUserRepository userRepository,
                                CurrentUserProvider currentUserProvider,
                                NotificationRepository notificationRepository,
                                NotificationStreamPort notificationStreamPort,
                                SubmissionRepository submissionRepository) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.classResourceRepository = classResourceRepository;
        this.libraryContentRepository = libraryContentRepository;
        this.userRepository = userRepository;
        this.currentUserProvider = currentUserProvider;
        this.notificationRepository = notificationRepository;
        this.notificationStreamPort = notificationStreamPort;
        this.submissionRepository = submissionRepository;
    }

    @Transactional(readOnly = true)
    public ClassResourceViews.Page listResources(UUID classId, int page, int size) {
        // BR-39: doc duoc ca khi lop INACTIVE, khong check status nhu cac thao tac ghi.
        Classroom classroom = requireAccessibleClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();
        boolean viewerIsOwner = classroom.isOwnedBy(currentUserId);
        ClassResourceRepository.PageResult result = classResourceRepository.findByClassId(classId, page, size);
        return new ClassResourceViews.Page(
                toSummaries(result.items(), currentUserId, viewerIsOwner), page, size, result.total());
    }

    @Transactional
    public ClassResourceViews.ResourceSummary postResource(UUID classId, String title, String description,
            ResourceSourceType sourceType, UUID sourceLibraryContentId, ClassResourceViews.AttachmentInput attachment,
            boolean submissionEnabled, Instant deadline) {
        Classroom classroom = requireOwnedActiveClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();

        String resolvedTitle;
        String thumbnailUrl = null;
        UUID resolvedSourceLibraryContentId = null;
        String attachmentUrl = null;
        String attachmentFileName = null;
        String attachmentContentType = null;
        Long attachmentSizeBytes = null;

        if (requireSourceType(sourceType) == ResourceSourceType.LIBRARY_SNAPSHOT) {
            LibraryContent libraryContent = libraryContentRepository
                    .findActiveById(requireLibraryContentId(sourceLibraryContentId))
                    .orElseThrow(() -> new ResourceNotFoundException("Personal Library item not found."));
            if (!libraryContent.ownerId().equals(currentUserId)) {
                throw new ForbiddenOperationException("You can only share your own Personal Library items.");
            }
            resolvedTitle = StringUtils.hasText(title) ? requireTitle(title) : libraryContent.title();
            thumbnailUrl = libraryContent.thumbnailUrl();
            resolvedSourceLibraryContentId = libraryContent.id();
        } else {
            resolvedTitle = requireTitle(title);
            ClassResourceViews.AttachmentInput requiredAttachment = requireAttachment(attachment);
            attachmentUrl = requiredAttachment.url();
            attachmentFileName = requiredAttachment.fileName();
            attachmentContentType = requiredAttachment.contentType();
            attachmentSizeBytes = requiredAttachment.sizeBytes();
        }

        Instant resolvedDeadline = submissionEnabled ? requireDeadline(deadline) : null;
        Instant now = Instant.now();
        ClassResource saved = classResourceRepository.save(new ClassResource(
                UUID.randomUUID(), classId, currentUserId, resolvedTitle, normalizeDescription(description),
                sourceType, resolvedSourceLibraryContentId, thumbnailUrl,
                null, attachmentUrl, attachmentFileName, attachmentContentType, attachmentSizeBytes,
                submissionEnabled, resolvedDeadline, now, now));

        notifyResourceChange(classroom, saved, classMemberRepository.findAllStudentIds(classId));

        return toSummary(saved, resolvePoster(currentUserId), SubmissionStatus.NOT_APPLICABLE);
    }

    @Transactional
    public ClassResourceViews.ResourceSummary updateResource(UUID classId, UUID resourceId, String title,
            String description, ClassResourceViews.AttachmentInput attachment, Boolean submissionEnabled,
            Instant deadline) {
        Classroom classroom = requireOwnedActiveClass(classId);
        ClassResource existing = requireClassResource(classId, resourceId);

        if (attachment != null && existing.sourceType() == ResourceSourceType.LIBRARY_SNAPSHOT) {
            throw new IllegalArgumentException("Cannot attach a file to a resource sourced from the Personal Library.");
        }

        String newTitle = StringUtils.hasText(title) ? requireTitle(title) : existing.title();
        String newDescription = description != null ? normalizeDescription(description) : existing.description();
        boolean newSubmissionEnabled = submissionEnabled != null ? submissionEnabled : existing.submissionEnabled();
        Instant newDeadline = newSubmissionEnabled
                ? (deadline != null ? deadline : existing.deadline())
                : null;
        if (newSubmissionEnabled && newDeadline == null) {
            throw new IllegalArgumentException("Deadline is required when submissions are enabled.");
        }
        boolean deadlineChanged = deadline != null && !deadline.equals(existing.deadline());
        if (newSubmissionEnabled && deadlineChanged && !newDeadline.isAfter(Instant.now())) {
            throw new IllegalArgumentException("Deadline must be in the future.");
        }

        String newAttachmentUrl = existing.attachmentUrl();
        String newAttachmentFileName = existing.attachmentFileName();
        String newAttachmentContentType = existing.attachmentContentType();
        Long newAttachmentSizeBytes = existing.attachmentSizeBytes();
        if (attachment != null) {
            newAttachmentUrl = attachment.url();
            newAttachmentFileName = attachment.fileName();
            newAttachmentContentType = attachment.contentType();
            newAttachmentSizeBytes = attachment.sizeBytes();
        }

        boolean assignmentChanged = newSubmissionEnabled != existing.submissionEnabled()
                || !Objects.equals(newDeadline, existing.deadline());

        ClassResource saved = classResourceRepository.save(new ClassResource(
                existing.id(), existing.classId(), existing.postedBy(), newTitle, newDescription,
                existing.sourceType(), existing.sourceLibraryContentId(), existing.thumbnailUrl(),
                existing.attachmentFileId(), newAttachmentUrl, newAttachmentFileName, newAttachmentContentType,
                newAttachmentSizeBytes, newSubmissionEnabled, newDeadline, existing.createdAt(), Instant.now()));

        if (assignmentChanged) {
            notifyResourceChange(classroom, saved, classMemberRepository.findAllStudentIds(classId));
        }

        return toSummary(saved, resolvePoster(saved.postedBy()), SubmissionStatus.NOT_APPLICABLE);
    }

    @Transactional
    public void deleteResource(UUID classId, UUID resourceId) {
        requireOwnedActiveClass(classId);
        ClassResource existing = requireClassResource(classId, resourceId);
        classResourceRepository.deleteById(existing.id());
    }

    private List<ClassResourceViews.ResourceSummary> toSummaries(List<ClassResource> resources, UUID viewerId, boolean viewerIsOwner) {
        if (resources.isEmpty()) {
            return List.of();
        }
        Map<UUID, AppUser> postersById = userRepository.findAllById(
                        resources.stream().map(ClassResource::postedBy).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::id, u -> u));
        // Owner khong phai nguoi nop bai -> khong can tra submissions (tranh query thua).
        Map<UUID, SubmissionStatus> ownStatuses = viewerIsOwner
                ? Map.of()
                : submissionRepository.findStatusesByResourceIds(
                        resources.stream().map(ClassResource::id).toList(), viewerId);
        return resources.stream()
                .map(r -> toSummary(r, postersById.get(r.postedBy()), resolveOwnStatus(r, viewerIsOwner, ownStatuses)))
                .toList();
    }

    private static SubmissionStatus resolveOwnStatus(
            ClassResource resource, boolean viewerIsOwner, Map<UUID, SubmissionStatus> ownStatuses) {
        if (viewerIsOwner || !resource.submissionEnabled()) {
            return SubmissionStatus.NOT_APPLICABLE;
        }
        return ownStatuses.getOrDefault(resource.id(), SubmissionStatus.NOT_SUBMITTED);
    }

    private static ClassResourceViews.ResourceSummary toSummary(
            ClassResource resource, AppUser poster, SubmissionStatus submissionStatus) {
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
                submissionStatus);
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

    private AppUser resolvePoster(UUID posterId) {
        return userRepository.findById(posterId).orElse(null);
    }

    private ClassResource requireClassResource(UUID classId, UUID resourceId) {
        ClassResource resource = classResourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Class resource not found."));
        if (!resource.classId().equals(classId)) {
            throw new ResourceNotFoundException("Class resource not found.");
        }
        return resource;
    }

    // ---- notification (BR-46): Post luon notify, Update chi notify khi doi submission/deadline ----

    private void notifyResourceChange(Classroom classroom, ClassResource resource, List<UUID> studentIds) {
        if (studentIds.isEmpty()) {
            return;
        }
        UUID senderId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        String title = "Tai lieu lop " + classroom.name();
        String content = "Giao vien da dang/cap nhat \"" + resource.title() + "\" trong lop \"" + classroom.name() + "\".";
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, classroom.subject(), title, content, now),
                studentIds);
        String senderName = resolveSenderName(senderId);
        NotificationEvent event = new NotificationEvent(
                saved.id(), saved.title(), saved.content(), saved.subject(), senderName, saved.createdAt());
        studentIds.forEach(id -> notificationStreamPort.publishNew(id, event));
    }

    private String resolveSenderName(UUID senderId) {
        return userRepository.findById(senderId)
                .map(u -> StringUtils.hasText(u.fullName()) ? u.fullName() : u.email())
                .orElse(null);
    }

    // ---- validate (Post/Update) ----

    private static ResourceSourceType requireSourceType(ResourceSourceType sourceType) {
        if (sourceType == null) {
            throw new IllegalArgumentException("Source type is required.");
        }
        return sourceType;
    }

    private static UUID requireLibraryContentId(UUID id) {
        if (id == null) {
            throw new IllegalArgumentException("sourceLibraryContentId is required for LIBRARY_SNAPSHOT.");
        }
        return id;
    }

    private static String requireTitle(String title) {
        if (!StringUtils.hasText(title)) {
            throw new IllegalArgumentException("Title is required.");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 255) {
            throw new IllegalArgumentException("Title must be at most 255 characters.");
        }
        return trimmed;
    }

    private static ClassResourceViews.AttachmentInput requireAttachment(ClassResourceViews.AttachmentInput attachment) {
        if (attachment == null || !StringUtils.hasText(attachment.url())) {
            throw new IllegalArgumentException("Attachment is required for FILE_UPLOAD.");
        }
        return attachment;
    }

    private static Instant requireDeadline(Instant deadline) {
        if (deadline == null) {
            throw new IllegalArgumentException("Deadline is required when submissions are enabled.");
        }
        if (!deadline.isAfter(Instant.now())) {
            throw new IllegalArgumentException("Deadline must be in the future.");
        }
        return deadline;
    }

    private static String normalizeDescription(String description) {
        if (description == null) {
            return null;
        }
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private Classroom requireOwnedClass(UUID classId) {
        Classroom classroom = requireClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (!classroom.isOwnedBy(currentUserId)) {
            throw new ForbiddenOperationException("You can only manage your own class.");
        }
        return classroom;
    }

    private Classroom requireOwnedActiveClass(UUID classId) {
        Classroom classroom = requireOwnedClass(classId);
        if (!classroom.isActive()) {
            throw new ForbiddenOperationException("Class is inactive and read-only.");
        }
        return classroom;
    }

    private Classroom requireClass(UUID classId) {
        return classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
    }
}
