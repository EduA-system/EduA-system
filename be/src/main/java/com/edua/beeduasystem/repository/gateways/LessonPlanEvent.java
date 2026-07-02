package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;
import java.util.UUID;

/**
 * Envelope sự kiện đẩy về client khi sinh giáo án 5512. Sealed interface với 5
 * biến thể, phân biệt bằng trường {@code type} khi serialize ra JSON.
 *
 * <p>Đặt ở {@code repository/gateways/} cùng {@link LessonPlanStreamPort} để
 * envelope thuộc gateway contract (không phụ thuộc implementation STOMP), dễ mock/test.
 *
 * <p>JSON discriminator: {@code "type": "FRAME_READY" | "ACTIVITY_READY" |
 * "ACTIVITY_FAILED" | "DONE" | "ERROR"}.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = LessonPlanEvent.FrameReady.class, name = "FRAME_READY"),
        @JsonSubTypes.Type(value = LessonPlanEvent.ActivityReady.class, name = "ACTIVITY_READY"),
        @JsonSubTypes.Type(value = LessonPlanEvent.ActivityFailed.class, name = "ACTIVITY_FAILED"),
        @JsonSubTypes.Type(value = LessonPlanEvent.Done.class, name = "DONE"),
        @JsonSubTypes.Type(value = LessonPlanEvent.Error.class, name = "ERROR")
})
public sealed interface LessonPlanEvent {

    String sessionId();

    /** Khung giáo án (Bước 1) sinh xong. */
    record FrameReady(String sessionId, LessonPlan5512 frame) implements LessonPlanEvent {
    }

    /** Một trong 4 hoạt động sinh xong thành công. */
    record ActivityReady(String sessionId, String activityId, Activity5512 activity)
            implements LessonPlanEvent {
    }

    /** Một hoạt động sinh thất bại sau khi thử lại tối đa. */
    record ActivityFailed(String sessionId, String activityId, List<String> reasons)
            implements LessonPlanEvent {
    }

    /** Pipeline hoàn tất, giáo án đã lưu; {@code lessonPlanId} là id bản ghi đã persist. */
    record Done(String sessionId, UUID lessonPlanId) implements LessonPlanEvent {
    }

    /** Pipeline thất bại chung. */
    record Error(String sessionId, String message) implements LessonPlanEvent {
    }
}
