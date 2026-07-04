package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
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
    private final String adminEmail;

    public AdminSeedRunner(AppUserRepository userRepository,
                           @Value("${app.auth.admin-seed-email:}") String adminEmail) {
        this.userRepository = userRepository;
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
        userRepository.save(new AppUser(
                UUID.randomUUID(),
                email,
                null,
                null,
                Role.ADMINISTRATOR,
                null,
                UserStatus.INVITED,
                Instant.now(),
                null));
        log.info("Seeded ADMINISTRATOR account for {}", email);
    }
}
