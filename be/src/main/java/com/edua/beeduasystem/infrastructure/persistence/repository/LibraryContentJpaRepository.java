package com.edua.beeduasystem.infrastructure.persistence.repository;
import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;
public interface LibraryContentJpaRepository extends JpaRepository<LibraryContentEntity, UUID>, JpaSpecificationExecutor<LibraryContentEntity> { }
