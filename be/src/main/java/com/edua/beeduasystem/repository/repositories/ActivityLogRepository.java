package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLog;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Ghi/đọc audit trail (SRS UC-11). Service phụ thuộc interface này; JPA impl ở
 * {@code infrastructure/persistence}.
 */
public interface ActivityLogRepository {

    void record(ActivityLog entry);

    SearchResult search(UUID actorId, ActivityLogCategory category, Instant from, Instant to, int page, int size);

    record SearchResult(List<ActivityLog> items, int page, int size, long total) {
    }
}
