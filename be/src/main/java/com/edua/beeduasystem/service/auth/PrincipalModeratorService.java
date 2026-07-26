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
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use-case quản lý Moderator bởi Principal (UC-60/61/62).
 */
@Service
public class PrincipalModeratorService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ActivityLogService activityLogService;

    public PrincipalModeratorService(AppUserRepository userRepository,
                                 UserRoleRepository userRoleRepository,
                                 CurrentUserProvider currentUserProvider,
                                 ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
    }

    public record ModeratorListResult(
            Page<AppUser> moderators,
            Map<UUID, String> grantedByNames,
            Map<UUID, UUID> granterUserIds,
            Map<UUID, Instant> grantedAts
    ) {
    }

    @Transactional(readOnly = true)
    public ModeratorListResult listModerators(Pageable pageable) {
        Page<AppUser> moderators = userRepository.findAllByRole(Role.MODERATOR, pageable);
        var userIds = moderators.getContent().stream().map(AppUser::id).collect(Collectors.toSet());
        if (userIds.isEmpty()) {
            return new ModeratorListResult(moderators, Map.of(), Map.of(), Map.of());
        }

        var granterUserIds = userRoleRepository.findGrantedByUserIdsByUserIds(userIds, Role.MODERATOR);
        var grantedAts = userRoleRepository.findGrantedAtsByUserIds(userIds, Role.MODERATOR);

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
        return new ModeratorListResult(moderators, granterNames, granterUserIds, grantedAts);
    }

    @Transactional
    public AppUser addModerator(String email, String rawSubject, String fullName) {
        String normalizedEmail = AppUserFieldValidator.normalizeEmail(email);
        String normalizedFullName = AppUserFieldValidator.normalizeOptionalFullName(fullName);
        Subject subject = Subject.valueOf(rawSubject.trim().toUpperCase());
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();

        if (userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, subject)) {
            throw new ForbiddenOperationException("Môn " + subject.name() + " đã có moderator. Mỗi môn chỉ được phép 1 moderator.");
        }

        var existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            AppUser u = existing.get();
            if (u.status() != UserStatus.DISABLED) {
                throw new DuplicateEmailException("Email " + normalizedEmail + " đã tồn tại trong hệ thống.");
            }
            AppUser reactivated = userRepository.save(new AppUser(
                    u.id(), u.email(), u.googleSub(),
                    normalizedFullName != null ? normalizedFullName : u.fullName(),
                    u.avatarUrl(), u.contactInfo(),
                    subject, UserStatus.INVITED, u.createdAt(), u.lastLoginAt()));
            assignRole(reactivated.id(), Role.MODERATOR, currentUserId, now);
            activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                    ActivityLogAction.GRANT_MODERATOR, "APP_USER", reactivated.id(), null);
            return reactivated;
        }

        AppUser saved = userRepository.save(new AppUser(
                UUID.randomUUID(), normalizedEmail, null,
                normalizedFullName,
                null, null,
                subject, UserStatus.INVITED, now, null));
        assignRole(saved.id(), Role.MODERATOR, currentUserId, now);
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.GRANT_MODERATOR, "APP_USER", saved.id(), null);
        return saved;
    }

    @Transactional
    public void deleteModerator(UUID id) {
        throw new ForbiddenOperationException(
                "Không thể thu hồi moderator độc lập. Hãy chỉ định moderator thay thế trước.");
    }

    @Transactional
    public AppUser replaceModerator(UUID id, String replacementEmail, boolean disablePrevious) {
        AppUser currentModerator = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy moderator."));
        if (currentModerator.status() == UserStatus.DISABLED
                || !userRoleRepository.findRolesByUserId(id).contains(Role.MODERATOR)) {
            throw new ResourceNotFoundException("Không tìm thấy moderator đang hoạt động.");
        }
        if (currentModerator.subject() == null) {
            throw new ForbiddenOperationException("Moderator chưa được gán môn học.");
        }

        String normalizedEmail = AppUserFieldValidator.normalizeEmail(replacementEmail);
        if (currentModerator.email().equals(normalizedEmail)) {
            throw new ForbiddenOperationException("Email moderator thay thế phải khác moderator hiện tại.");
        }

        Subject subject = currentModerator.subject();
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        AppUser replacement = userRepository.findByEmail(normalizedEmail)
                .map(user -> prepareExistingReplacement(user, subject))
                .orElseGet(() -> new AppUser(
                        UUID.randomUUID(), normalizedEmail, null, null, null, null,
                        subject, UserStatus.INVITED, now, null));

        UserStatus previousStatus = disablePrevious ? UserStatus.DISABLED : currentModerator.status();
        AppUser demotedModerator = new AppUser(
                currentModerator.id(), currentModerator.email(), currentModerator.googleSub(), currentModerator.fullName(),
                currentModerator.avatarUrl(), currentModerator.contactInfo(), currentModerator.subject(), previousStatus,
                currentModerator.createdAt(), currentModerator.lastLoginAt());

        // Both updates share this transaction, so a failure restores the original moderator.
        userRepository.save(demotedModerator);
        assignRole(demotedModerator.id(), Role.TEACHER, currentUserId, now);

        AppUser savedReplacement = userRepository.save(replacement);
        assignRole(savedReplacement.id(), Role.MODERATOR, currentUserId, now);
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REPLACE_MODERATOR, "APP_USER", savedReplacement.id(),
                "oldUserId=" + demotedModerator.id());
        return savedReplacement;
    }

    @Transactional
    public AppUser reactivateModerator(UUID id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy moderator."));
        if (user.status() != UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Moderator chưa bị thu hồi.");
        }
        var roles = userRoleRepository.findRolesByUserId(id);
        if (!roles.contains(Role.MODERATOR)) {
            throw new ResourceNotFoundException("Không tìm thấy moderator.");
        }
        if (user.subject() != null && userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, user.subject())) {
            throw new ForbiddenOperationException("Môn " + user.subject().name() + " đã có moderator khác. Mỗi môn chỉ được phép 1 moderator.");
        }
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        AppUser reactivated = userRepository.save(new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(),
                user.avatarUrl(), user.contactInfo(),
                user.subject(), UserStatus.INVITED, user.createdAt(), user.lastLoginAt()));
        assignRole(reactivated.id(), Role.MODERATOR, currentUserId, now);
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REACTIVATE_MODERATOR, "APP_USER", reactivated.id(), null);
        return reactivated;
    }

    private void assignRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt) {
        userRoleRepository.replaceRole(userId, role, grantedBy, grantedAt);
    }

    private AppUser prepareExistingReplacement(AppUser user, Subject subject) {
        if (user.subject() != subject) {
            throw new ForbiddenOperationException("Moderator thay thế phải thuộc cùng môn " + subject.name() + ".");
        }
        if (user.status() != UserStatus.DISABLED
                && userRoleRepository.findRolesByUserId(user.id()).contains(Role.MODERATOR)) {
            throw new ForbiddenOperationException("Môn " + subject.name() + " đã có moderator đang hoạt động khác.");
        }
        UserStatus status = user.status() == UserStatus.DISABLED ? UserStatus.INVITED : user.status();
        return new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(), user.avatarUrl(), user.contactInfo(),
                user.subject(), status, user.createdAt(), user.lastLoginAt());
    }
}
