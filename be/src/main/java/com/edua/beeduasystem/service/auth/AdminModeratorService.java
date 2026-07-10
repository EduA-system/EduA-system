package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
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
 * Use-case quản lý Moderator bởi Administrator (UC-60/61/62).
 */
@Service
public class AdminModeratorService {

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;

    public AdminModeratorService(AppUserRepository userRepository,
                                 UserRoleRepository userRoleRepository,
                                 CurrentUserProvider currentUserProvider) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
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
        String normalizedEmail = email.trim().toLowerCase();
        Subject subject = Subject.valueOf(rawSubject.trim().toUpperCase());
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
                    subject, UserStatus.INVITED, u.createdAt(), u.lastLoginAt()));
            assignRole(reactivated.id(), Role.MODERATOR, currentUserId, now);
            return reactivated;
        }

        AppUser saved = userRepository.save(new AppUser(
                UUID.randomUUID(), normalizedEmail, null,
                fullName != null ? fullName.trim() : null,
                subject, UserStatus.INVITED, now, null));
        assignRole(saved.id(), Role.MODERATOR, currentUserId, now);
        return saved;
    }

    @Transactional
    public void deleteModerator(UUID id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy moderator."));
        if (user.status() == UserStatus.DISABLED) {
            throw new ResourceNotFoundException("Không tìm thấy moderator.");
        }
        var roles = userRoleRepository.findRolesByUserId(id);
        if (!roles.contains(Role.MODERATOR)) {
            throw new ResourceNotFoundException("Không tìm thấy moderator.");
        }
        userRepository.save(new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(),
                user.subject(), UserStatus.DISABLED, user.createdAt(), user.lastLoginAt()));
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
        UUID currentUserId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        AppUser reactivated = userRepository.save(new AppUser(
                user.id(), user.email(), user.googleSub(), user.fullName(),
                user.subject(), UserStatus.INVITED, user.createdAt(), user.lastLoginAt()));
        assignRole(reactivated.id(), Role.MODERATOR, currentUserId, now);
        return reactivated;
    }

    private void assignRole(UUID userId, Role role, UUID grantedBy, Instant grantedAt) {
        userRoleRepository.replaceRole(userId, role, grantedBy, grantedAt);
    }
}
