package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.AppUser;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Truy cập người dùng (allowlist). Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}.
 */
public interface AppUserRepository {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findById(UUID id);

    /** Nạp nhiều user theo id (dùng resolve tên tác giả cho danh sách blog, tránh N+1). */
    List<AppUser> findAllById(Collection<UUID> ids);

    /** Insert (cấp quyền / seed) hoặc update (lazy-activate lần đầu login, last_login). */
    AppUser save(AppUser user);
}
