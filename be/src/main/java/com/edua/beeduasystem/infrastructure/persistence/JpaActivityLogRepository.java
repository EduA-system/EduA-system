package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLog;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.infrastructure.persistence.entity.ActivityLogEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ActivityLogJpaRepository;
import com.edua.beeduasystem.repository.repositories.ActivityLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class JpaActivityLogRepository implements ActivityLogRepository {

    private final ActivityLogJpaRepository jpa;

    public JpaActivityLogRepository(ActivityLogJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public void record(ActivityLog entry) {
        ActivityLogEntity e = new ActivityLogEntity();
        e.setId(entry.id());
        e.setActorId(entry.actorId());
        e.setActorRole(entry.actorRole());
        e.setCategory(entry.category());
        e.setAction(entry.action());
        e.setTargetType(entry.targetType());
        e.setTargetId(entry.targetId());
        e.setMetadata(entry.metadata());
        e.setCreatedAt(entry.createdAt());
        jpa.save(e);
    }

    @Override
    @Transactional(readOnly = true)
    public SearchResult search(UUID actorId, ActivityLogCategory category, Instant from, Instant to, int page,
            int size) {
        Specification<ActivityLogEntity> spec = (root, cq, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (actorId != null) {
                predicates.add(cb.equal(root.get("actorId"), actorId));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = jpa.findAll(spec, pageable);
        List<ActivityLog> items = result.getContent().stream().map(JpaActivityLogRepository::toDomain).toList();
        return new SearchResult(items, page, size, result.getTotalElements());
    }

    private static ActivityLog toDomain(ActivityLogEntity e) {
        return new ActivityLog(
                e.getId(),
                e.getActorId(),
                e.getActorRole(),
                e.getCategory(),
                e.getAction(),
                e.getTargetType(),
                e.getTargetId(),
                e.getMetadata(),
                e.getCreatedAt());
    }
}
