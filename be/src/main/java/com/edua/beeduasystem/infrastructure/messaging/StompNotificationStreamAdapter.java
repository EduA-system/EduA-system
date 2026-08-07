package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class StompNotificationStreamAdapter implements NotificationStreamPort {

    private static final String DESTINATION = "/queue/notifications";

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishNew(UUID recipientUserId, NotificationEvent event) {
        log.debug("publish notification {} -> user {}", event.id(), recipientUserId);
        messagingTemplate.convertAndSendToUser(recipientUserId.toString(), DESTINATION, event);
    }
}
