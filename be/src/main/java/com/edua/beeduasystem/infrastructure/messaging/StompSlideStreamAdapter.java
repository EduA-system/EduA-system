package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.domain.model.slide.SlideBackground;
import com.edua.beeduasystem.domain.model.slide.SlideElement;
import com.edua.beeduasystem.repository.gateways.SlideEvent;
import com.edua.beeduasystem.repository.gateways.SlideStreamPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompSlideStreamAdapter implements SlideStreamPort {

    private static final String TOPIC_PREFIX = "/topic/slides/";

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishPart(String sessionId, String partId, List<SlideElement> elements, SlideBackground background) {
        send(sessionId, new SlideEvent.SlidePartReady(sessionId, partId, elements, background));
    }

    @Override
    public void publishPartError(String sessionId, String partId, String message) {
        send(sessionId, new SlideEvent.SlidePartFailed(sessionId, partId, message));
    }

    @Override
    public void publishLog(String sessionId, String level, String source, String message, String partId) {
        send(sessionId, new SlideEvent.Log(sessionId, level, source, message, partId));
    }

    @Override
    public void publishDone(String sessionId, int partFailures, UUID deckId) {
        send(sessionId, new SlideEvent.Done(sessionId, partFailures, deckId));
    }

    @Override
    public void publishFailed(String sessionId, String message) {
        send(sessionId, new SlideEvent.Error(sessionId, message));
    }

    private void send(String sessionId, SlideEvent event) {
        log.debug("publish {} -> {}", event.getClass().getSimpleName(), sessionId);
        messagingTemplate.convertAndSend(TOPIC_PREFIX + sessionId, event);
    }
}
