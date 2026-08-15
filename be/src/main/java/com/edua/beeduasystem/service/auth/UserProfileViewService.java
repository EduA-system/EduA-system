package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.presentation.dto.auth.UserProfileViewDto;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Xem hồ sơ read-only của người khác theo quan hệ được cấp quyền:
 * Moderator → Teacher cùng môn hoặc Student trong lớp mình quản lý; Teacher → Student trong lớp mình dạy;
 * Principal → Moderator/IT Staff. Student không được xem hồ sơ người khác.
 * Tài khoản đã bị thu hồi (DISABLED) không xem được. Việc sửa hồ sơ của chính mình dùng
 * {@code ProfileService}/{@code PATCH /api/users/me}, không đi qua service này.
 */
@Service
public class UserProfileViewService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeacherGradeRepository teacherGradeRepository;
    private final ClassRepository classRepository;
    private final CurrentUserProvider currentUser;

    public UserProfileViewService(AppUserRepository userRepository,
                                  UserRoleRepository userRoleRepository,
                                  TeacherGradeRepository teacherGradeRepository,
                                  ClassRepository classRepository,
                                  CurrentUserProvider currentUser) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.teacherGradeRepository = teacherGradeRepository;
        this.classRepository = classRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public UserProfileViewDto view(UUID targetId) {
        UUID viewerId = currentUser.requireUserId();
        if (viewerId.equals(targetId)) {
            throw new ForbiddenOperationException("Dùng /api/users/me để xem/sửa hồ sơ của chính mình.");
        }

        AppUser target = userRepository.findById(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));
        // DISABLED coi như không tồn tại đối với người xem — không lộ thông tin tài khoản đã bị thu hồi.
        if (target.status() == UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Không tìm thấy người dùng.");
        }

        Set<Role> viewerRoles = userRoleRepository.findRolesByUserId(viewerId);
        Set<Role> targetRoles = userRoleRepository.findRolesByUserId(targetId);

        if (viewerRoles.contains(Role.MODERATOR) && targetRoles.contains(Role.TEACHER)) {
            AppUser viewer = userRepository.findById(viewerId)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng."));
            if (viewer.subject() == null || target.subject() != viewer.subject()) {
                throw new ForbiddenOperationException("Bạn chỉ có thể xem hồ sơ giáo viên cùng môn.");
            }
            List<Integer> grades = teacherGradeRepository.findGradesByUserIds(List.of(targetId)).getOrDefault(targetId, List.of());
            return toDto(target, Role.TEACHER, grades, grantedAt(targetId, Role.TEACHER), grantedByName(targetId, Role.TEACHER));
        }

        if ((viewerRoles.contains(Role.TEACHER) || viewerRoles.contains(Role.MODERATOR))
                && targetRoles.contains(Role.STUDENT)) {
            List<Classroom> ownedClassesWithStudent = classRepository
                    .searchEnrolled(targetId, null, null, null, null, 0, 100)
                    .items().stream()
                    .filter(c -> c.isOwnedBy(viewerId))
                    .toList();
            if (ownedClassesWithStudent.isEmpty()) {
                throw new ForbiddenOperationException("Bạn chỉ có thể xem hồ sơ học sinh trong lớp mình quản lý.");
            }
            List<Integer> grades = ownedClassesWithStudent.stream()
                    .map(Classroom::grade).filter(Objects::nonNull).distinct().sorted().toList();
            return toDto(target, Role.STUDENT, grades, null, null);
        }

        if (viewerRoles.contains(Role.PRINCIPAL) && targetRoles.contains(Role.MODERATOR)) {
            return toDto(target, Role.MODERATOR, List.of(), grantedAt(targetId, Role.MODERATOR), grantedByName(targetId, Role.MODERATOR));
        }

        if (viewerRoles.contains(Role.PRINCIPAL) && targetRoles.contains(Role.IT_STAFF)) {
            return toDto(target, Role.IT_STAFF, List.of(), grantedAt(targetId, Role.IT_STAFF), grantedByName(targetId, Role.IT_STAFF));
        }

        throw new ForbiddenOperationException("Bạn không có quyền xem hồ sơ người dùng này.");
    }

    private Instant grantedAt(UUID userId, Role role) {
        return userRoleRepository.findGrantedAtsByUserIds(Set.of(userId), role).get(userId);
    }

    private String grantedByName(UUID userId, Role role) {
        UUID granterId = userRoleRepository.findGrantedByUserIdsByUserIds(Set.of(userId), role).get(userId);
        if (granterId == null) return null;
        return userRepository.findById(granterId).map(UserProfileViewService::displayName).orElse(null);
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }

    private static UserProfileViewDto toDto(AppUser user, Role role, List<Integer> grades, Instant grantedAt, String grantedByName) {
        return new UserProfileViewDto(user.id(), user.fullName(), user.avatarUrl(), user.email(), user.bio(),
                role, user.subject(), grades, user.status(), grantedAt, grantedByName);
    }
}
