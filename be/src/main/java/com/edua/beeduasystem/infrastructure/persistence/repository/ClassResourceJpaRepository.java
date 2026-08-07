package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.ClassResourceEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClassResourceJpaRepository extends JpaRepository<ClassResourceEntity, UUID> {

    Page<ClassResourceEntity> findByClassIdOrderByCreatedAtDesc(UUID classId, Pageable pageable);
}
