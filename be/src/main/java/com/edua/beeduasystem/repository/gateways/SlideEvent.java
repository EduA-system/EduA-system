package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.slide.SlideBackground;
import com.edua.beeduasystem.domain.model.slide.SlideElement;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;
import java.util.UUID;

/**
 * Envelope STOMP khi sinh slide deck. Phân loại bằng {@code type} khi serialize JSON.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = SlideEvent.SlidePartReady.class, name = "SLIDE_PART_READY"),
        @JsonSubTypes.Type(value = SlideEvent.SlidePartFailed.class, name = "SLIDE_PART_FAILED"),
        @JsonSubTypes.Type(value = SlideEvent.Log.class, name = "LOG"),
        @JsonSubTypes.Type(value = SlideEvent.Done.class, name = "DONE"),
        @JsonSubTypes.Type(value = SlideEvent.Error.class, name = "ERROR")
})
public sealed interface SlideEvent {

    String sessionId();

    record SlidePartReady(
            String sessionId,
            String partId,
            List<SlideElement> elements,
            SlideBackground background
    ) implements SlideEvent {
    }

    record SlidePartFailed(String sessionId, String partId, String message) implements SlideEvent {
    }

    record Log(String sessionId, String level, String source, String message, String partId) implements SlideEvent {
    }

    record Done(String sessionId, int partFailures, UUID deckId) implements SlideEvent {
    }

    record Error(String sessionId, String message) implements SlideEvent {
    }
}
