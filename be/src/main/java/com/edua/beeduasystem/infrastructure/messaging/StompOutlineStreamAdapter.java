package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.repository.gateways.OutlineEvent;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompOutlineStreamAdapter implements OutlineStreamPort {

    private static final String TOPIC_PREFIX = "/topic/outline/";

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishPartSkeletonReady(String sessionId, PartDto part) {
        send(sessionId, new OutlineEvent.OutlinePartSkeletonReady(sessionId, part));
    }

    @Override
    public void publishPartReady(String sessionId, String partId, List<SlideItemDto> slides) {
        send(sessionId, new OutlineEvent.OutlinePartReady(sessionId, partId, slides));
    }

    @Override
    public void publishPartError(String sessionId, String partId, String message) {
        send(sessionId, new OutlineEvent.OutlinePartFailed(sessionId, partId, message));
    }

    @Override
    public void publishSlideReady(String sessionId, String partId, SlideItemDto slide) {
        send(sessionId, new OutlineEvent.OutlineSlideReady(sessionId, partId, slide));
    }

    @Override
    public void publishSlideError(String sessionId, String partId, String slideId, String message) {
        send(sessionId, new OutlineEvent.OutlineSlideFailed(sessionId, partId, slideId, message));
    }

    @Override
    public void publishDone(String sessionId, int partFailures) {
        send(sessionId, new OutlineEvent.Done(sessionId, partFailures));
    }

    @Override
    public void publishFailed(String sessionId, String message) {
        send(sessionId, new OutlineEvent.Error(sessionId, message));
    }

    private void send(String sessionId, OutlineEvent event) {
        log.debug("publish {} -> {}", event.getClass().getSimpleName(), sessionId);
        messagingTemplate.convertAndSend(TOPIC_PREFIX + sessionId, event);
    }
}
