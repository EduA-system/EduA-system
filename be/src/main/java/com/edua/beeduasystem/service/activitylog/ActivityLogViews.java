package com.edua.beeduasystem.service.activitylog;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * View model ở tầng service cho activity log: kèm tên actor (resolve từ {@code app_users}) —
 * thứ không nằm trong domain model. Controller map các record này sang DTO.
 */
public final class ActivityLogViews {

    private ActivityLogViews() {
    }

    public record Summary(
            UUID id,
            UUID actorId,
            String actorName,
            String actorRole,
            ActivityLogCategory category,
            ActivityLogAction action,
            String targetType,
            UUID targetId,
            String metadata,
            Instant createdAt
    ) {
    }

    public record Page<T>(
            List<T> items,
            int page,
            int size,
            long total
    ) {
    }
}
