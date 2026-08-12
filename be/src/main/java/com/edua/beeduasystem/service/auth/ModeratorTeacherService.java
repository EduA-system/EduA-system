package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.RefreshTokenRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case quản lý Teacher bởi Moderator (UC-13/14/15).
 * Moderator chỉ quản lý Teacher có subject trùng với subject của mình.
 */
@Service
public class ModeratorTeacherService {

    private final AppUserRepository userRepository;
    private final ClassRepository classRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeacherGradeRepository teacherGradeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ActivityLogService activityLogService;

    public ModeratorTeacherService(AppUserRepository userRepository,
                                   ClassRepository classRepository,
                                   UserRoleRepository userRoleRepository,
                                   TeacherGradeRepository teacherGradeRepository,
                                   RefreshTokenRepository refreshTokenRepository,
                                   CurrentUserProvider currentUserProvider,
                                   ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.classRepository = classRepository;
        this.userRoleRepository = userRoleRepository;
        this.teacherGradeRepository = teacherGradeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
    }

    public record TeacherListResult(
            Page<AppUser> teachers,
            Map<UUID, String> grantedByNames,
            Map<UUID, UUID> granterUserIds,
            Map<UUID, Instant> grantedAts,
            Map<UUID, List<Integer>> gradesByUserIds
    ) {
    }

    @Transactional(readOnly = true)
    public TeacherListResult listTeachers(Pageable pageable) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        Page<AppUser> teachers = userRepository.findAllByRoleAndSubject(Role.TEACHER, moderatorSubject, pageable);
        var userIds = teachers.getContent().stream().map(AppUser::id).collect(Collectors.toSet());
        if (userIds.isEmpty()) {
            return new TeacherListResult(teachers, Map.of(), Map.of(), Map.of(), Map.of());
        }

        var granterUserIds = userRoleRepository.findGrantedByUserIdsByUserIds(userIds, Role.TEACHER);
        var grantedAts = userRoleRepository.findGrantedAtsByUserIds(userIds, Role.TEACHER);
        var gradesByUserIds = teacherGradeRepository.findGradesByUserIds(userIds);

        var granterIds = granterUserIds.values().stream()
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        Map<UUID, String> granterNames;
        if (granterIds.isEmpty()) {
            granterNames = Map.of();
        } else {
            granterNames = userRepository.findAllById(granterIds).stream()
                    .collect(Collectors.toMap(AppUser::id, u -> u.fullName() != null ? u.fullName() : u.email()));
        }
        return new TeacherListResult(teachers, granterNames, granterUserIds, grantedAts, gradesByUserIds);
    }

    @Transactional(readOnly = true)
    public AccountStatusStats countTeachersByStatus() {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        var counts = userRepository.countStatusByRole(Role.TEACHER, moderatorSubject);
        return new AccountStatusStats(counts.active(), counts.disabled());
    }

    @Transactional
    public AppUser addTeacher(String email, String rawSubject, String fullName, Collection<Integer> grades) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        Subject requestSubject = Subject.valueOf(rawSubject.trim().toUpperCase());
        if (requestSubject != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ có thể thêm giáo viên môn " + moderatorSubject.name() + ".");
        }

        String normalizedEmail = AppUserFieldValidator.normalizeEmail(email);
        String normalizedFullName = AppUserFieldValidator.normalizeOptionalFullName(fullName);
        List<Integer> normalizedGrades = normalizeGrades(grades);
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();

        var existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            AppUser u = existing.get();
            AppUser reactivated = userRepository.save(prepareExistingTeacher(u, moderatorSubject, normalizedFullName));
            assignRole(reactivated.id(), Role.TEACHER, currentUserId, now);
            teacherGradeRepository.replaceGrades(reactivated.id(), normalizedGrades);
            activityLogService.record(currentUserId, "MODERATOR", ActivityLogCategory.ACCOUNT,
                    ActivityLogAction.GRANT_TEACHER, "APP_USER", reactivated.id(), null);
            return reactivated;
        }

        AppUser saved = userRepository.save(new AppUser(
                UUID.randomUUID(), normalizedEmail, null,
                normalizedFullName,
                null, null, null, null,
                moderatorSubject, UserStatus.INVITED, now, null, null));
        assignRole(saved.id(), Role.TEACHER, currentUserId, now);
        teacherGradeRepository.replaceGrades(saved.id(), normalizedGrades);
        activityLogService.record(currentUserId, "MODERATOR", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.GRANT_TEACHER, "APP_USER", saved.id(), null);
        return saved;
    }

    @Transactional
    public void deleteTeacher(UUID id) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo viên."));
        if (user.status() == UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Không tìm thấy giáo viên.");
        }
        var roles = userRoleRepository.findRolesByUserId(id);
        if (!roles.contains(Role.TEACHER)) {
            throw new ResourceNotFoundException("Không tìm thấy giáo viên.");
        }
        if (user.subject() != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ có thể quản lý giáo viên môn " + moderatorSubject.name() + ".");
        }
        userRepository.save(new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(),
                user.avatarUrl(), user.contactInfo(),
                user.bio(), user.phoneNumber(),
                user.subject(), UserStatus.DISABLED, user.createdAt(), user.lastLoginAt(), user.dateOfBirth()));
        classRepository.archiveActiveByOwnerId(user.id());
        refreshTokenRepository.revokeAllByUserId(user.id());
        activityLogService.record(currentUserProvider.requireUserId(), "MODERATOR", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REVOKE_TEACHER, "APP_USER", user.id(), null);
    }

    @Transactional
    public AppUser updateTeacher(UUID id, String fullName, String phoneNumber, LocalDate dateOfBirth, Collection<Integer> grades) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        AppUser user = requireManageableTeacher(id, moderatorSubject);
        List<Integer> normalizedGrades = normalizeGrades(grades);
        AppUser updated = userRepository.save(new AppUser(
                user.id(),
                user.email(),
                user.googleSub(),
                AppUserFieldValidator.normalizeOptionalDisplayName(fullName),
                user.avatarUrl(),
                user.contactInfo(),
                user.bio(),
                AppUserFieldValidator.normalizeVietnamPhoneNumber(phoneNumber),
                user.subject(),
                user.status(),
                user.createdAt(),
                user.lastLoginAt(),
                AppUserFieldValidator.normalizeEducatorDateOfBirth(dateOfBirth)));
        teacherGradeRepository.replaceGrades(updated.id(), normalizedGrades);
        activityLogService.record(currentUserProvider.requireUserId(), "MODERATOR", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.UPDATE_TEACHER, "APP_USER", updated.id(), null);
        return updated;
    }

    @Transactional
    public AppUser reactivateTeacher(UUID id) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo viên."));
        if (user.status() != UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Giáo viên chưa bị thu hồi.");
        }
        var roles = userRoleRepository.findRolesByUserId(id);
        if (!roles.contains(Role.TEACHER)) {
            throw new ResourceNotFoundException("Không tìm thấy giáo viên.");
        }
        if (user.subject() != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ có thể quản lý giáo viên môn " + moderatorSubject.name() + ".");
        }
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        AppUser reactivated = userRepository.save(new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(),
                user.avatarUrl(), user.contactInfo(),
                user.bio(), user.phoneNumber(),
                user.subject(), UserStatus.INVITED, user.createdAt(), user.lastLoginAt(), user.dateOfBirth()));
        assignRole(reactivated.id(), Role.TEACHER, currentUserId, now);
        activityLogService.record(currentUserId, "MODERATOR", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REACTIVATE_TEACHER, "APP_USER", reactivated.id(), null);
        return reactivated;
    }

    private AppUser requireManageableTeacher(UUID id, Subject moderatorSubject) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giáo viên."));
        var roles = userRoleRepository.findRolesByUserId(id);
        if (!roles.contains(Role.TEACHER)) {
            throw new ResourceNotFoundException("Không tìm thấy giáo viên.");
        }
        if (user.subject() != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ có thể quản lý giáo viên môn " + moderatorSubject.name() + ".");
        }
        return user;
    }

    private void assignRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt) {
        userRoleRepository.replaceRole(userId, role, grantedBy, grantedAt);
    }

    private static final Map<Role, String> INELIGIBLE_ROLE_LABELS = Map.of(
            Role.STUDENT, "Học sinh",
            Role.MODERATOR, "Moderator",
            Role.PRINCIPAL, "Hiệu trưởng",
            Role.IT_STAFF, "IT Staff");

    private AppUser prepareExistingTeacher(AppUser user, Subject moderatorSubject, String normalizedFullName) {
        if (user.status() != UserStatus.DISABLED) {
            throw new DuplicateEmailException("Email " + user.email() + " đã tồn tại trong hệ thống.");
        }
        Set<Role> roles = userRoleRepository.findRolesByUserId(user.id());
        if (!roles.contains(Role.TEACHER)) {
            String roleLabel = Role.orderedByPriority(roles).stream()
                    .map(INELIGIBLE_ROLE_LABELS::get)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("vai trò khác");
            throw new ForbiddenOperationException(
                    "Tài khoản này là " + roleLabel + ", không thể trở thành Giáo Viên.");
        }
        if (user.subject() != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Tài khoản này thuộc môn " + subjectLabel(user.subject())
                            + ", không thể thêm vào môn " + moderatorSubject.name() + ".");
        }
        return new AppUser(
                user.id(), user.email(), user.googleSub(),
                normalizedFullName != null ? normalizedFullName : user.fullName(),
                user.avatarUrl(), user.contactInfo(),
                user.bio(), user.phoneNumber(),
                user.subject(), UserStatus.INVITED, user.createdAt(), user.lastLoginAt(), user.dateOfBirth());
    }

    private static String subjectLabel(Subject subject) {
        return subject == null ? "chưa gán" : subject.name();
    }

    private static List<Integer> normalizeGrades(Collection<Integer> grades) {
        if (grades == null || grades.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn ít nhất một khối.");
        }
        Set<Integer> normalized = new LinkedHashSet<>();
        for (Integer grade : grades) {
            if (grade == null || grade < 10 || grade > 12) {
                throw new IllegalArgumentException("Khối chỉ được chọn 10, 11 hoặc 12.");
            }
            normalized.add(grade);
        }
        return normalized.stream().sorted().toList();
    }
}
