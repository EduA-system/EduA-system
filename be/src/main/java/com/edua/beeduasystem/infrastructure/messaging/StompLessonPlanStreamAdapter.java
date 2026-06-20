package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.presentation.dto.lessonplan.Activity5512Dto;
import com.edua.beeduasystem.presentation.dto.lessonplan.LessonPlan5512Dto;
import com.edua.beeduasystem.repository.LessonPlanEvent;
import com.edua.beeduasystem.repository.LessonPlanStreamPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Implementation STOMP của {@link LessonPlanStreamPort}. Đẩy từng sự kiện tới
 * topic {@code /topic/lesson-plan/{sessionId}} qua {@link SimpMessagingTemplate}.
 * Envelope {@link LessonPlanEvent} tự phân loại qua {@code @JsonSubTypes}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompLessonPlanStreamAdapter implements LessonPlanStreamPort {

    private static final String TOPIC_PREFIX = "/topic/lesson-plan/";

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishFrameReady(String sessionId, LessonPlan5512Dto frame) {
        send(sessionId, new LessonPlanEvent.FrameReady(sessionId, frame));
    }

    @Override
    public void publishActivityReady(String sessionId, String activityId, Activity5512Dto activity) {
        send(sessionId, new LessonPlanEvent.ActivityReady(sessionId, activityId, activity));
    }

    @Override
    public void publishActivityFailed(String sessionId, String activityId, List<String> reasons) {
        send(sessionId, new LessonPlanEvent.ActivityFailed(sessionId, activityId, reasons));
    }

    @Override
    public void publishDone(String sessionId, UUID lessonPlanId) {
        send(sessionId, new LessonPlanEvent.Done(sessionId, lessonPlanId));
    }

    @Override
    public void publishFailed(String sessionId, String message) {
        send(sessionId, new LessonPlanEvent.Error(sessionId, message));
    }

    private void send(String sessionId, LessonPlanEvent event) {
        log.debug("publish {} -> {}", event.getClass().getSimpleName(), sessionId);
        messagingTemplate.convertAndSend(TOPIC_PREFIX + sessionId, event);
    }
}
