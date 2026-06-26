package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.slide.SlideBackground;
import com.edua.beeduasystem.domain.model.slide.SlideElement;
import com.edua.beeduasystem.infrastructure.messaging.StompSlideStreamAdapter;
import com.edua.beeduasystem.repository.gateways.SlideEvent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class StompSlideStreamAdapterTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private StompSlideStreamAdapter adapter;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void publishPart_sendsSlidePartReadyToTopic() throws Exception {
        var elements = List.<SlideElement>of(new SlideElement.Text(
                "t1", 0, 0, 100, 40, 0.0, 1, false,
                "<p>Hi</p>", 24, "#000", "left"));
        var bg = new SlideBackground("color", "#fff");

        adapter.publishPart("sess-1", "slide-1", elements, bg);

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/slides/sess-1"), captor.capture());

        SlideEvent event = objectMapper.convertValue(captor.getValue(), SlideEvent.class);
        assertTrue(event instanceof SlideEvent.SlidePartReady);
        assertEquals("slide-1", ((SlideEvent.SlidePartReady) event).partId());
    }

    @Test
    void publishDone_sendsDoneEvent() throws Exception {
        UUID deckId = UUID.randomUUID();
        adapter.publishDone("sess-2", 0, deckId);

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/slides/sess-2"), captor.capture());

        SlideEvent event = objectMapper.convertValue(captor.getValue(), SlideEvent.class);
        assertTrue(event instanceof SlideEvent.Done);
        assertEquals(deckId, ((SlideEvent.Done) event).deckId());
    }
}
