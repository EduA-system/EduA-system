package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
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
 * Seed 1 tài khoản PRINCIPAL đầu tiên (allowlist) từ {@code app.auth.principal-seed-email}.
 * Idempotent: bỏ qua nếu email trống hoặc đã tồn tại. Vì không self-registration (BR-01),
 * cần principal gốc này để đăng nhập và cấp quyền cho người khác.
 */
@Component
public class PrincipalSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PrincipalSeedRunner.class);

    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final String principalEmail;

    public PrincipalSeedRunner(AppUserRepository userRepository,
                           UserRoleRepository userRoleRepository,
                           @Value("${app.auth.principal-seed-email:}") String principalEmail) {
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.principalEmail = principalEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(principalEmail)) {
            return;
        }
        String email = principalEmail.trim().toLowerCase();
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
                null,
                null,
                UserStatus.INVITED,
                now,
                null));
        userRoleRepository.replaceRole(saved.id(), Role.PRINCIPAL, null, now);
        log.info("Seeded PRINCIPAL account for {}", email);
    }
}
