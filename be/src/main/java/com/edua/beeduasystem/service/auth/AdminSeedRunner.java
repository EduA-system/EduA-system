package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserRole;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.infrastructure.persistence.repository.RoleJpaRepository;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.UUID;

/**
 * Seed 1 tài khoản ADMINISTRATOR đầu tiên (allowlist) từ {@code app.auth.admin-seed-email}.
 * Idempotent: bỏ qua nếu email trống hoặc đã tồn tại. Vì không self-registration (BR-01),
 * cần admin gốc này để đăng nhập và cấp quyền cho người khác.
 */
@Component
public class AdminSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeedRunner.class);

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleJpaRepository roleJpaRepository;
    private final String adminEmail;

    public AdminSeedRunner(AppUserRepository userRepository,
                           UserRoleRepository userRoleRepository,
                           RoleJpaRepository roleJpaRepository,
                           @Value("${app.auth.admin-seed-email:}") String adminEmail) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.roleJpaRepository = roleJpaRepository;
        this.adminEmail = adminEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(adminEmail)) {
            return;
        }
        String email = adminEmail.trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }
        Instant now = Instant.now();
        AppUser saved = userRepository.save(new AppUser(
                UUID.randomUUID(),
                email,
                null,
                null,
                null,
                UserStatus.INVITED,
                now,
                null));
        // Assign ADMINISTRATOR role
        var roleEntity = roleJpaRepository.findByName(Role.ADMINISTRATOR.name())
                .orElseThrow(() -> new IllegalStateException("Role ADMINISTRATOR not found in DB"));
        userRoleRepository.save(new UserRole(
                UUID.randomUUID(), saved.id(), roleEntity.getId(), null, now));
        log.info("Seeded ADMINISTRATOR account for {}", email);
    }
}
