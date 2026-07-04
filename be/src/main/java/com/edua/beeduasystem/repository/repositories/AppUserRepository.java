package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.AppUser;

import java.util.Optional;
import java.util.UUID;

/**
 * Truy cập người dùng (allowlist). Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}.
 */
public interface AppUserRepository {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findById(UUID id);

    /** Insert (cấp quyền / seed) hoặc update (lazy-activate lần đầu login, last_login). */
    AppUser save(AppUser user);
}
