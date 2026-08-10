package com.edua.beeduasystem.infrastructure.persistence.repository;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.LibraryContentEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.UUID;
public interface LibraryContentJpaRepository extends JpaRepository<LibraryContentEntity, UUID>, JpaSpecificationExecutor<LibraryContentEntity> {
    long countByStatusAndSubjectAndDeletedAtIsNull(LibraryContentStatus status, Subject subject);
    long countByStatusAndDeletedAtIsNull(LibraryContentStatus status);

    @Query(value = """
            SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, type, COUNT(*) AS total
            FROM library_contents
            WHERE deleted_at IS NULL
              AND created_at >= :fromInclusive
              AND created_at < :toExclusive
            GROUP BY month, type
            ORDER BY month ASC
            """, nativeQuery = true)
    List<Object[]> countCreatedByMonthAndTypeRaw(@Param("fromInclusive") Instant fromInclusive,
                                                 @Param("toExclusive") Instant toExclusive);

    @Query(value = """
            SELECT subject, type, COUNT(*) AS total
            FROM library_contents
            WHERE deleted_at IS NULL
              AND subject IS NOT NULL
            GROUP BY subject, type
            """, nativeQuery = true)
    List<Object[]> countBySubjectAndTypeRaw();
}
