package com.edua.beeduasystem.infrastructure.persistence.repository;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.UUID;
public interface LibraryContentJpaRepository extends JpaRepository<LibraryContentEntity, UUID>, JpaSpecificationExecutor<LibraryContentEntity> {
    long countByStatusAndSubjectAndDeletedAtIsNull(LibraryContentStatus status, Subject subject);
}
