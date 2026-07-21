package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;

import java.util.List;

public interface OutlineStreamPort {

    void publishPartSkeletonReady(String sessionId, PartDto part);

    void publishPartReady(String sessionId, String partId, List<SlideItemDto> slides);

    void publishPartError(String sessionId, String partId, String message);

    void publishSlideReady(String sessionId, String partId, SlideItemDto slide);

    void publishSlideError(String sessionId, String partId, String slideId, String message);

    void publishDone(String sessionId, int partFailures);

    void publishFailed(String sessionId, String message);
}
