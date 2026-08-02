package com.edua.beeduasystem.domain.model.activitylog;

import java.time.Instant;
import java.util.UUID;

/** Một bản ghi audit: ai làm gì, trên đối tượng nào, khi nào (SRS UC-11). */
public record ActivityLog(
        UUID id,
        UUID actorId,
        String actorRole,
        ActivityLogCategory category,
        ActivityLogAction action,
        String targetType,
        UUID targetId,
        String metadata,
        Instant createdAt
) {
}
