package com.edua.beeduasystem.service.activitylog;

import com.edua.beeduasystem.domain.model.activitylog.ActivityLog;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogAction;
import com.edua.beeduasystem.domain.model.activitylog.ActivityLogCategory;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.ActivityLogRepository;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ActivityLogServiceTest {

    private ActivityLogRepository repository;
    private AppUserRepository userRepository;
    private ActivityLogService service;

    @BeforeEach
    void setup() {
        repository = mock(ActivityLogRepository.class);
        userRepository = mock(AppUserRepository.class);
        service = new ActivityLogService(repository, userRepository);
    }

    @Test
    void record_persistsEntryWithGeneratedIdAndTimestamp() {
        UUID actorId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();

        service.record(actorId, "MODERATOR", ActivityLogCategory.MODERATION, ActivityLogAction.APPROVE_LIBRARY_CONTENT,
                "LIBRARY_CONTENT", targetId, "note");

        ArgumentCaptor<ActivityLog> captor = ArgumentCaptor.forClass(ActivityLog.class);
        verify(repository).record(captor.capture());
        ActivityLog saved = captor.getValue();
        assertThat(saved.id()).isNotNull();
        assertThat(saved.actorId()).isEqualTo(actorId);
        assertThat(saved.actorRole()).isEqualTo("MODERATOR");
        assertThat(saved.category()).isEqualTo(ActivityLogCategory.MODERATION);
        assertThat(saved.action()).isEqualTo(ActivityLogAction.APPROVE_LIBRARY_CONTENT);
        assertThat(saved.targetType()).isEqualTo("LIBRARY_CONTENT");
        assertThat(saved.targetId()).isEqualTo(targetId);
        assertThat(saved.metadata()).isEqualTo("note");
        assertThat(saved.createdAt()).isNotNull();
    }

    @Test
    void search_passesAllFiltersThroughToRepository() {
        UUID actorId = UUID.randomUUID();
        Instant from = Instant.now().minusSeconds(3600);
        Instant to = Instant.now();
        when(repository.search(actorId, ActivityLogCategory.ACCOUNT, from, to, 1, 10))
                .thenReturn(new ActivityLogRepository.SearchResult(List.of(), 1, 10, 0));

        service.search(actorId, ActivityLogCategory.ACCOUNT, from, to, 1, 10);

        verify(repository).search(eq(actorId), eq(ActivityLogCategory.ACCOUNT), eq(from), eq(to), eq(1), eq(10));
    }

    @Test
    void search_withNoFilters_passesNullsThrough() {
        when(repository.search(isNull(), isNull(), isNull(), isNull(), eq(0), eq(20)))
                .thenReturn(new ActivityLogRepository.SearchResult(List.of(), 0, 20, 0));

        service.search(null, null, null, null, 0, 20);

        verify(repository).search(isNull(), isNull(), isNull(), isNull(), eq(0), eq(20));
    }

    @Test
    void search_resolvesActorDisplayNamePreferringFullName() {
        UUID actorId = UUID.randomUUID();
        ActivityLog entry = new ActivityLog(UUID.randomUUID(), actorId, "IT_STAFF", ActivityLogCategory.CONFIG,
                ActivityLogAction.UPDATE_SYSTEM_PROMPT, "AI_SYSTEM_PROMPT", null, "key=LESSON_PLAN_GENERATION",
                Instant.now());
        when(repository.search(any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(new ActivityLogRepository.SearchResult(List.of(entry), 0, 20, 1));
        AppUser actor = new AppUser(actorId, "it-staff@edua.vn", null, "Nguyen Van A", null, null, null,
                UserStatus.ACTIVE, Instant.now(), Instant.now());
        when(userRepository.findAllById(List.of(actorId))).thenReturn(List.of(actor));

        ActivityLogViews.Page<ActivityLogViews.Summary> page = service.search(null, null, null, null, 0, 20);

        assertThat(page.items()).hasSize(1);
        assertThat(page.items().get(0).actorName()).isEqualTo("Nguyen Van A");
        assertThat(page.items().get(0).action()).isEqualTo(ActivityLogAction.UPDATE_SYSTEM_PROMPT);
        assertThat(page.total()).isEqualTo(1);
    }

    @Test
    void search_fallsBackToEmailWhenFullNameBlank() {
        UUID actorId = UUID.randomUUID();
        ActivityLog entry = new ActivityLog(UUID.randomUUID(), actorId, "PRINCIPAL", ActivityLogCategory.ACCOUNT,
                ActivityLogAction.GRANT_MODERATOR, "APP_USER", UUID.randomUUID(), null, Instant.now());
        when(repository.search(any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(new ActivityLogRepository.SearchResult(List.of(entry), 0, 20, 1));
        AppUser actor = new AppUser(actorId, "principal@edua.vn", null, "  ", null, null, null,
                UserStatus.ACTIVE, Instant.now(), Instant.now());
        when(userRepository.findAllById(List.of(actorId))).thenReturn(List.of(actor));

        ActivityLogViews.Page<ActivityLogViews.Summary> page = service.search(null, null, null, null, 0, 20);

        assertThat(page.items().get(0).actorName()).isEqualTo("principal@edua.vn");
    }
}
