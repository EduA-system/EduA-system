package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Truy cập người dùng (allowlist). Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}.
 */
public interface AppUserRepository {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findById(UUID id);

    /** Nạp nhiều user theo id (dùng resolve tên tác giả cho danh sách blog, tránh N+1). */
    List<AppUser> findAllById(Collection<UUID> ids);

    AppUser save(AppUser user);

    /** Xóa tài khoản (dùng khi hard-delete học sinh chưa từng đăng nhập). */
    void deleteById(UUID id);

    /** Danh sách user theo role (phân trang, join user_roles). */
    Page<AppUser> findAllByRole(Role role, Pageable pageable);

    /** Danh sách user theo role + subject (phân trang). */
    Page<AppUser> findAllByRoleAndSubject(Role role, Subject subject, Pageable pageable);

    /** Kiểm tra có user active với role + subject đã cho không (dùng cho ràng buộc 1 moderator/subject). */
    boolean existsActiveByRoleAndSubject(Role role, Subject subject);

    List<RoleStatusAggregate> countActiveInactiveByRole(Subject subject);

    record RoleStatusAggregate(Role role, boolean active, long count) { }
}
