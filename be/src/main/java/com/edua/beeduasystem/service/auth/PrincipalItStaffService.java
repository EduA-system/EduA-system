package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.RefreshTokenRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
public class PrincipalItStaffService {
    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ActivityLogService activityLogService;

    public PrincipalItStaffService(AppUserRepository userRepository, UserRoleRepository userRoleRepository,
                                    RefreshTokenRepository refreshTokenRepository,
                                    CurrentUserProvider currentUserProvider, ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
    }

    @Transactional(readOnly = true)
    public Page<AppUser> list(Pageable pageable) { return userRepository.findAllByRole(Role.IT_STAFF, pageable); }

    @Transactional
    public AppUser add(String email, String fullName) {
        userRoleRepository.lockRole(Role.IT_STAFF);
        ensureItStaffSeatAvailable();
        String normalizedEmail = AppUserFieldValidator.normalizeEmail(email);
        String normalizedFullName = AppUserFieldValidator.normalizeOptionalFullName(fullName);
        Instant now = Instant.now();
        UUID grantedBy = currentUserProvider.requireUserId();
        var existing = userRepository.findByEmail(normalizedEmail);
        AppUser user = existing.map(value -> prepareExistingItStaff(value, normalizedFullName))
                .orElseGet(() -> new AppUser(UUID.randomUUID(), normalizedEmail, null,
                        normalizedFullName, null, null, null, null, null,
                        UserStatus.INVITED, now, null, null));
        AppUser saved = userRepository.save(user);
        userRoleRepository.replaceRole(saved.id(), Role.IT_STAFF, grantedBy, now);
        activityLogService.record(grantedBy, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.GRANT_IT_STAFF, "APP_USER", saved.id(), null);
        return saved;
    }

    @Transactional
    public void disable(UUID id) {
        userRoleRepository.lockRole(Role.IT_STAFF);
        requireItStaff(id);
        throw new ForbiddenOperationException(
                "Không thể thu hồi IT Staff độc lập. Hãy chỉ định IT Staff thay thế trước.");
    }

    @Transactional
    public AppUser replace(UUID id, String replacementEmail, String fullName) {
        userRoleRepository.lockRole(Role.IT_STAFF);
        AppUser currentItStaff = requireActiveItStaff(id);
        String normalizedEmail = AppUserFieldValidator.normalizeEmail(replacementEmail);
        if (currentItStaff.email().equals(normalizedEmail)) {
            throw new ForbiddenOperationException("Email IT Staff thay thế phải khác IT Staff hiện tại.");
        }

        String normalizedFullName = AppUserFieldValidator.normalizeOptionalFullName(fullName);
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        AppUser replacement = userRepository.findByEmail(normalizedEmail)
                .map(user -> prepareExistingItStaff(user, normalizedFullName))
                .orElseGet(() -> new AppUser(UUID.randomUUID(), normalizedEmail, null,
                        normalizedFullName, null, null, null, null, null,
                        UserStatus.INVITED, now, null, null));

        AppUser disabledPrevious = new AppUser(currentItStaff.id(), currentItStaff.email(), currentItStaff.googleSub(),
                currentItStaff.fullName(), currentItStaff.avatarUrl(), currentItStaff.contactInfo(),
                currentItStaff.bio(), currentItStaff.phoneNumber(), currentItStaff.subject(), UserStatus.DISABLED,
                currentItStaff.createdAt(), currentItStaff.lastLoginAt(), currentItStaff.dateOfBirth());
        userRepository.save(disabledPrevious);
        refreshTokenRepository.revokeAllByUserId(disabledPrevious.id());
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REVOKE_IT_STAFF, "APP_USER", disabledPrevious.id(), null);

        AppUser savedReplacement = userRepository.save(replacement);
        userRoleRepository.replaceRole(savedReplacement.id(), Role.IT_STAFF, currentUserId, now);
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REPLACE_IT_STAFF, "APP_USER", savedReplacement.id(),
                "oldUserId=" + disabledPrevious.id());
        return savedReplacement;
    }

    @Transactional
    public AppUser reactivate(UUID id) {
        userRoleRepository.lockRole(Role.IT_STAFF);
        ensureItStaffSeatAvailable();
        AppUser user = requireItStaff(id);
        if (user.status() != UserStatus.DISABLED) throw new ResourceNotFoundException("Tài khoản IT Staff chưa bị thu hồi.");
        Instant now = Instant.now();
        AppUser saved = userRepository.save(new AppUser(user.id(), user.email(), user.googleSub(), user.fullName(),
                user.avatarUrl(), user.contactInfo(), user.bio(), user.phoneNumber(), null, UserStatus.INVITED,
                user.createdAt(), user.lastLoginAt(), user.dateOfBirth()));
        UUID currentUserId = currentUserProvider.requireUserId();
        userRoleRepository.replaceRole(saved.id(), Role.IT_STAFF, currentUserId, now);
        activityLogService.record(currentUserId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REACTIVATE_IT_STAFF, "APP_USER", saved.id(), null);
        return saved;
    }

    private AppUser requireItStaff(UUID id) {
        AppUser user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản IT Staff."));
        if (!userRoleRepository.findRolesByUserId(id).contains(Role.IT_STAFF)) throw new ResourceNotFoundException("Không tìm thấy tài khoản IT Staff.");
        return user;
    }

    private AppUser requireActiveItStaff(UUID id) {
        AppUser user = requireItStaff(id);
        if (user.status() == UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Không tìm thấy tài khoản IT Staff đang hoạt động.");
        }
        return user;
    }

    private void ensureItStaffSeatAvailable() {
        if (userRepository.existsActiveByRole(Role.IT_STAFF)) {
            throw new ForbiddenOperationException(
                    "Hệ thống đã có IT Staff. Hãy thay thế IT Staff hiện tại nếu muốn đổi người.");
        }
    }

    private static final Map<Role, String> INELIGIBLE_ROLE_LABELS = Map.of(
            Role.STUDENT, "Học sinh",
            Role.TEACHER, "Giáo viên",
            Role.MODERATOR, "Moderator",
            Role.PRINCIPAL, "Hiệu trưởng");

    private AppUser prepareExistingItStaff(AppUser user, String normalizedFullName) {
        if (user.status() != UserStatus.DISABLED) {
            throw new DuplicateEmailException("Email " + user.email() + " đã tồn tại trong hệ thống.");
        }
        Set<Role> roles = userRoleRepository.findRolesByUserId(user.id());
        if (!roles.contains(Role.IT_STAFF)) {
            String roleLabel = Role.orderedByPriority(roles).stream()
                    .map(INELIGIBLE_ROLE_LABELS::get)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("vai trò khác");
            throw new ForbiddenOperationException(
                    "Tài khoản này là " + roleLabel + ", không thể trở thành IT Staff.");
        }
        return new AppUser(user.id(), user.email(), user.googleSub(),
                normalizedFullName != null ? normalizedFullName : user.fullName(),
                user.avatarUrl(), user.contactInfo(), user.bio(), user.phoneNumber(), null, UserStatus.INVITED,
                user.createdAt(), user.lastLoginAt(), user.dateOfBirth());
    }
}
