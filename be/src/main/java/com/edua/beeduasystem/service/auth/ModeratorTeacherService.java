package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case quản lý Teacher bởi Moderator (UC-13/14/15).
 * Moderator chỉ quản lý Teacher có subject trùng với subject của mình.
 */
@Service
public class ModeratorTeacherService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;

    public ModeratorTeacherService(AppUserRepository userRepository,
                                   UserRoleRepository userRoleRepository,
                                   CurrentUserProvider currentUserProvider) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
    }

    public record TeacherListResult(
            Page<AppUser> teachers,
            Map<UUID, String> grantedByNames,
            Map<UUID, UUID> granterUserIds,
            Map<UUID, Instant> grantedAts
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
            return new TeacherListResult(teachers, Map.of(), Map.of(), Map.of());
        }

        var granterUserIds = userRoleRepository.findGrantedByUserIdsByUserIds(userIds, Role.TEACHER);
        var grantedAts = userRoleRepository.findGrantedAtsByUserIds(userIds, Role.TEACHER);

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
        return new TeacherListResult(teachers, granterNames, granterUserIds, grantedAts);
    }

    @Transactional
    public AppUser addTeacher(String email, String rawSubject, String fullName) {
        Subject moderatorSubject = currentUserProvider.require().subject();
        if (moderatorSubject == null) {
            throw new ForbiddenOperationException("Moderator phải có subject để quản lý giáo viên.");
        }
        Subject requestSubject = Subject.valueOf(rawSubject.trim().toUpperCase());
        if (requestSubject != moderatorSubject) {
            throw new ForbiddenOperationException(
                    "Bạn chỉ có thể thêm giáo viên môn " + moderatorSubject.name() + ".");
        }

        String normalizedEmail = email.trim().toLowerCase();
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();

        var existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            AppUser u = existing.get();
            if (u.status() != UserStatus.DISABLED) {
                throw new DuplicateEmailException("Email " + normalizedEmail + " đã tồn tại trong hệ thống.");
            }
            AppUser reactivated = userRepository.save(new AppUser(
                    u.id(), u.email(), u.googleSub(),
                    fullName != null ? fullName.trim() : u.fullName(),
                    u.avatarUrl(), u.contactInfo(),
                    moderatorSubject, UserStatus.INVITED, u.createdAt(), u.lastLoginAt()));
            assignRole(reactivated.id(), Role.TEACHER, currentUserId, now);
            return reactivated;
        }

        AppUser saved = userRepository.save(new AppUser(
                UUID.randomUUID(), normalizedEmail, null,
                fullName != null ? fullName.trim() : null,
                null, null,
                moderatorSubject, UserStatus.INVITED, now, null));
        assignRole(saved.id(), Role.TEACHER, currentUserId, now);
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
                user.subject(), UserStatus.DISABLED, user.createdAt(), user.lastLoginAt()));
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
                user.subject(), UserStatus.INVITED, user.createdAt(), user.lastLoginAt()));
        assignRole(reactivated.id(), Role.TEACHER, currentUserId, now);
        return reactivated;
    }

    private void assignRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt) {
        userRoleRepository.replaceRole(userId, role, grantedBy, grantedAt);
    }
}
