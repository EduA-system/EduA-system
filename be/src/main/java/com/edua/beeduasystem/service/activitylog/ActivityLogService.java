package com.edua.beeduasystem.service.activitylog;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLog;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.repository.repositories.ActivityLogRepository;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Ghi/đọc audit trail cho IT Staff xem & lọc (SRS UC-11). */
@Service
public class ActivityLogService {

    private final ActivityLogRepository repository;
    private final AppUserRepository userRepository;

    public ActivityLogService(ActivityLogRepository repository, AppUserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void record(UUID actorId, String actorRole, ActivityLogCategory category, ActivityLogAction action,
            String targetType, UUID targetId, String metadata) {
        repository.record(new ActivityLog(
                UUID.randomUUID(), actorId, actorRole, category, action, targetType, targetId, metadata,
                Instant.now()));
    }

    @Transactional(readOnly = true)
    public ActivityLogViews.Page<ActivityLogViews.Summary> search(UUID actorId, ActivityLogCategory category,
            Instant from, Instant to, int page, int size) {
        var result = repository.search(actorId, category, from, to, page, size);

        Map<UUID, String> actorNames = resolveActorNames(result.items().stream().map(ActivityLog::actorId).toList());

        List<ActivityLogViews.Summary> items = result.items().stream()
                .map(entry -> new ActivityLogViews.Summary(
                        entry.id(), entry.actorId(), actorNames.get(entry.actorId()), entry.actorRole(),
                        entry.category(), entry.action(), entry.targetType(), entry.targetId(), entry.metadata(),
                        entry.createdAt()))
                .toList();

        return new ActivityLogViews.Page<>(items, result.page(), result.size(), result.total());
    }

    private Map<UUID, String> resolveActorNames(Collection<UUID> actorIds) {
        return userRepository.findAllById(actorIds.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(AppUser::id, ActivityLogService::displayName, (a, b) -> a));
    }

    private static String displayName(AppUser user) {
        return user.fullName() != null && !user.fullName().isBlank() ? user.fullName() : user.email();
    }
}
