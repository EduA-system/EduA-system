package com.edua.beeduasystem.infrastructure.persistence.repository;

import com.edua.beeduasystem.infrastructure.persistence.entity.TextbookEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TextbookJpaRepository extends JpaRepository<TextbookEntity, UUID> {

    List<TextbookEntity> findAllByOrderByGradeAsc();
}
