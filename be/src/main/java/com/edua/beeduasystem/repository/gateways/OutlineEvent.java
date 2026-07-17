package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;

/**
 * Envelope STOMP khi expand outline 2 pha. Pha 1 trả khung ngay, pha 2 stream nội dung từng phần.
 * Phân loại bằng {@code type} khi serialize JSON (giống {@link SlideEvent}).
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = OutlineEvent.OutlinePartSkeletonReady.class, name = "OUTLINE_PART_SKELETON_READY"),
        @JsonSubTypes.Type(value = OutlineEvent.OutlinePartReady.class, name = "OUTLINE_PART_READY"),
        @JsonSubTypes.Type(value = OutlineEvent.OutlinePartFailed.class, name = "OUTLINE_PART_FAILED"),
        @JsonSubTypes.Type(value = OutlineEvent.Done.class, name = "DONE"),
        @JsonSubTypes.Type(value = OutlineEvent.Error.class, name = "ERROR")
})
public sealed interface OutlineEvent {

    String sessionId();

    record OutlinePartSkeletonReady(String sessionId, PartDto part) implements OutlineEvent {
    }

    record OutlinePartReady(String sessionId, String partId, List<SlideItemDto> slides) implements OutlineEvent {
    }

    record OutlinePartFailed(String sessionId, String partId, String message) implements OutlineEvent {
    }

    record Done(String sessionId, int partFailures) implements OutlineEvent {
    }

    record Error(String sessionId, String message) implements OutlineEvent {
    }
}
