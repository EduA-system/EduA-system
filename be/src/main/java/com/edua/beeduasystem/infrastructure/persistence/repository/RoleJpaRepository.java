package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.RoleEntity;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface RoleJpaRepository extends JpaRepository<RoleEntity, UUID> {

    Optional<RoleEntity> findByName(String name);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RoleEntity r WHERE r.name = :name")
    Optional<RoleEntity> findLockedByName(@Param("name") String name);
}
