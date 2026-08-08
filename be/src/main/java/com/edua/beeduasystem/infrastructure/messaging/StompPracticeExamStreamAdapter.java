package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.repository.gateways.PracticeExamEvent;
import com.edua.beeduasystem.repository.gateways.PracticeExamStreamPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Implementation STOMP của {@link PracticeExamStreamPort}. Đẩy từng sự kiện tới
 * topic {@code /topic/practice-exam/{sessionId}} qua {@link SimpMessagingTemplate}.
 * Envelope {@link PracticeExamEvent} tự phân loại qua {@code @JsonSubTypes}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class StompPracticeExamStreamAdapter implements PracticeExamStreamPort {

    private static final String TOPIC_PREFIX = "/topic/practice-exam/";

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishPlanReady(String sessionId, String title, String instructions, int durationMinutes,
                                 int totalScoreCentiPoints, List<PracticeExamEvent.QuestionStub> stubs) {
        send(sessionId, new PracticeExamEvent.PlanReady(sessionId, title, instructions, durationMinutes,
                totalScoreCentiPoints, stubs));
    }

    @Override
    public void publishBatchReady(String sessionId, List<PracticeExam.Question> questions) {
        send(sessionId, new PracticeExamEvent.BatchReady(sessionId, questions));
    }

    @Override
    public void publishBatchFailed(String sessionId, List<Integer> orders, String reason) {
        send(sessionId, new PracticeExamEvent.BatchFailed(sessionId, orders, reason));
    }

    @Override
    public void publishDone(String sessionId) {
        send(sessionId, new PracticeExamEvent.Done(sessionId));
    }

    @Override
    public void publishFailed(String sessionId, String message) {
        send(sessionId, new PracticeExamEvent.Error(sessionId, message));
    }

    private void send(String sessionId, PracticeExamEvent event) {
        log.debug("publish {} -> {}", event.getClass().getSimpleName(), sessionId);
        messagingTemplate.convertAndSend(TOPIC_PREFIX + sessionId, event);
    }
}
