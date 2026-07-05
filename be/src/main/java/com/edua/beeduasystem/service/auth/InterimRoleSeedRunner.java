package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.UUID;

/**
 * Seed tài khoản Teacher/Moderator tạm (allowlist) từ config — vì chức năng Admin cấp tài khoản chưa làm.
 * Idempotent: bỏ qua nếu email trống hoặc đã tồn tại. Cho phép login Google + test luồng Blog theo role.
 * Xem {@code designs/blog/blog-flow.md} §7.
 */
@Component
@Order(20)
public class InterimRoleSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(InterimRoleSeedRunner.class);

    private final AppUserRepository userRepository;
    private final String teacherEmail;
    private final String teacherSubject;
    private final String moderatorEmail;
    private final String moderatorSubject;

    public InterimRoleSeedRunner(
            AppUserRepository userRepository,
            @Value("${app.auth.teacher-seed-email:}") String teacherEmail,
            @Value("${app.auth.teacher-seed-subject:}") String teacherSubject,
            @Value("${app.auth.moderator-seed-email:}") String moderatorEmail,
            @Value("${app.auth.moderator-seed-subject:}") String moderatorSubject) {
        this.userRepository = userRepository;
        this.teacherEmail = teacherEmail;
        this.teacherSubject = teacherSubject;
        this.moderatorEmail = moderatorEmail;
        this.moderatorSubject = moderatorSubject;
    }

    @Override
    public void run(ApplicationArguments args) {
        seed(teacherEmail, Role.TEACHER, teacherSubject);
        seed(moderatorEmail, Role.MODERATOR, moderatorSubject);
    }

    private void seed(String rawEmail, Role role, String rawSubject) {
        if (!StringUtils.hasText(rawEmail)) {
            return;
        }
        String email = rawEmail.trim().toLowerCase();
        if (userRepository.findByEmail(email).isPresent()) {
            return;
        }
        Subject subject = parseSubject(rawSubject, role);
        userRepository.save(new AppUser(
                UUID.randomUUID(),
                email,
                null,
                null,
                role,
                subject,
                UserStatus.INVITED,
                Instant.now(),
                null));
        log.info("Seeded {} account for {} (subject={})", role, email, subject);
    }

    private Subject parseSubject(String rawSubject, Role role) {
        if (!StringUtils.hasText(rawSubject)) {
            return null;
        }
        try {
            return Subject.valueOf(rawSubject.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            log.warn("Ignoring invalid seed subject '{}' for {} — allowed: MATH, CHEMISTRY, PHYSICS", rawSubject, role);
            return null;
        }
    }
}
