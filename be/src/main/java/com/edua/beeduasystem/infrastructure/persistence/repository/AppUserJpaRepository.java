package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.infrastructure.persistence.entity.AppUserEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserJpaRepository extends JpaRepository<AppUserEntity, UUID> {

    Optional<AppUserEntity> findByEmail(String email);

    @Query("SELECT u FROM AppUserEntity u JOIN UserRoleEntity ur ON u.id = ur.userId JOIN RoleEntity r ON ur.roleId = r.id WHERE r.name = :roleName")
    Page<AppUserEntity> findByRoleName(@Param("roleName") String roleName, Pageable pageable);

    @Query("SELECT u FROM AppUserEntity u JOIN UserRoleEntity ur ON u.id = ur.userId JOIN RoleEntity r ON ur.roleId = r.id WHERE r.name = :roleName AND u.subject = :subject")
    Page<AppUserEntity> findByRoleNameAndSubject(@Param("roleName") String roleName, @Param("subject") Subject subject, Pageable pageable);

    @Query("SELECT COUNT(u) > 0 FROM AppUserEntity u JOIN UserRoleEntity ur ON u.id = ur.userId JOIN RoleEntity r ON ur.roleId = r.id WHERE r.name = :roleName AND u.subject = :subject AND u.status <> 'DISABLED'")
    boolean existsActiveByRoleNameAndSubject(@Param("roleName") String roleName, @Param("subject") Subject subject);

    @Query("SELECT COUNT(u) > 0 FROM AppUserEntity u JOIN UserRoleEntity ur ON u.id = ur.userId JOIN RoleEntity r ON ur.roleId = r.id WHERE r.name = :roleName AND u.status <> 'DISABLED'")
    boolean existsActiveByRoleName(@Param("roleName") String roleName);

    @Query(value = """
            SELECT
              COALESCE(SUM(CASE WHEN u.status <> 'DISABLED' THEN 1 ELSE 0 END), 0) AS active_count,
              COALESCE(SUM(CASE WHEN u.status = 'DISABLED' THEN 1 ELSE 0 END), 0) AS disabled_count
            FROM app_users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = :roleName
              AND (:subject IS NULL OR u.subject = CAST(:subject AS varchar))
            """, nativeQuery = true)
    List<Object[]> countStatusByRoleRaw(@Param("roleName") String roleName, @Param("subject") String subject);

    @Query(value = """
            SELECT r.name, CASE WHEN u.status = 'ACTIVE' THEN true ELSE false END AS active_bucket, COUNT(*) AS total
            FROM app_users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('TEACHER', 'MODERATOR', 'IT_STAFF', 'STUDENT')
              AND (:subject IS NULL OR r.name NOT IN ('TEACHER', 'MODERATOR') OR u.subject = CAST(:subject AS varchar))
            GROUP BY r.name, active_bucket
            """, nativeQuery = true)
    List<Object[]> countActiveInactiveByRoleRaw(@Param("subject") String subject);
}
