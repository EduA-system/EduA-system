package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class PrincipalItStaffService {
    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final ActivityLogService activityLogService;

    public PrincipalItStaffService(AppUserRepository userRepository, UserRoleRepository userRoleRepository,
                                    CurrentUserProvider currentUserProvider, ActivityLogService activityLogService) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
        this.activityLogService = activityLogService;
    }

    @Transactional(readOnly = true)
    public Page<AppUser> list(Pageable pageable) { return userRepository.findAllByRole(Role.IT_STAFF, pageable); }

    @Transactional
    public AppUser add(String email, String fullName) {
        String normalizedEmail = email.trim().toLowerCase();
        Instant now = Instant.now();
        UUID grantedBy = currentUserProvider.requireUserId();
        var existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent() && existing.get().status() != UserStatus.DISABLED) {
            throw new DuplicateEmailException("Email " + normalizedEmail + " đã tồn tại trong hệ thống.");
        }
        AppUser user = existing.map(value -> new AppUser(value.id(), value.email(), value.googleSub(),
                        fullName == null || fullName.isBlank() ? value.fullName() : fullName.strip(), value.avatarUrl(),
                        value.contactInfo(), null, UserStatus.INVITED, value.createdAt(), value.lastLoginAt()))
                .orElseGet(() -> new AppUser(UUID.randomUUID(), normalizedEmail, null,
                        fullName == null || fullName.isBlank() ? null : fullName.strip(), null, null, null,
                        UserStatus.INVITED, now, null));
        AppUser saved = userRepository.save(user);
        userRoleRepository.replaceRole(saved.id(), Role.IT_STAFF, grantedBy, now);
        activityLogService.record(grantedBy, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.GRANT_IT_STAFF, "APP_USER", saved.id(), null);
        return saved;
    }

    @Transactional
    public void disable(UUID id) {
        AppUser user = requireItStaff(id);
        userRepository.save(new AppUser(user.id(), user.email(), user.googleSub(), user.fullName(), user.avatarUrl(),
                user.contactInfo(), user.subject(), UserStatus.DISABLED, user.createdAt(), user.lastLoginAt()));
        activityLogService.record(currentUserProvider.requireUserId(), "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.REVOKE_IT_STAFF, "APP_USER", user.id(), null);
    }

    @Transactional
    public AppUser reactivate(UUID id) {
        AppUser user = requireItStaff(id);
        if (user.status() != UserStatus.DISABLED) throw new ResourceNotFoundException("Tài khoản IT Staff chưa bị thu hồi.");
        Instant now = Instant.now();
        AppUser saved = userRepository.save(new AppUser(user.id(), user.email(), user.googleSub(), user.fullName(),
                user.avatarUrl(), user.contactInfo(), null, UserStatus.INVITED, user.createdAt(), user.lastLoginAt()));
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
}
