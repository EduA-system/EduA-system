package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.slide.SlideBackground;
import com.edua.beeduasystem.domain.model.slide.SlideElement;

import java.util.List;
import java.util.UUID;

public interface SlideStreamPort {

    void publishPart(String sessionId, String partId, List<SlideElement> elements, SlideBackground background);

    void publishPartError(String sessionId, String partId, String message);

    void publishLog(String sessionId, String level, String source, String message, String partId);

    void publishDone(String sessionId, int partFailures, UUID deckId);

    void publishFailed(String sessionId, String message);
}
