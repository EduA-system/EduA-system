package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;

import java.util.List;
import java.util.UUID;

/**
 * Gateway contract để đẩy tiến trình sinh giáo án 5512 về client (qua STOMP).
 *
 * <p>Nằm ở {@code repository/gateways/} cùng {@code AiClient} theo
 * Report4 SDS (§1.2 Package Diagram): interface kỹ thuật thuần, không phụ thuộc
 * transport cụ thể. Implementation STOMP nằm ở
 * {@code infrastructure/messaging/}.
 *
 * <p>Thứ tự sự kiện kỳ vọng khi sinh giáo án 5512:
 * {@code FRAME_READY} đầu tiên → tối đa 4 × ({@code ACTIVITY_READY} |
 * {@code ACTIVITY_FAILED}) → kết thúc bằng {@code DONE} (thành công)
 * hoặc {@code ERROR} (thất bại).
 */
public interface LessonPlanStreamPort {

    /** Khung giáo án đã sinh xong (Bước 1 pipeline 5512). */
    void publishFrameReady(String sessionId, LessonPlan5512 frame);

    /** Một hoạt động trong số 4 đã sinh xong thành công. */
    void publishActivityReady(String sessionId, String activityId, Activity5512 activity);

    /** Một hoạt động sinh thất bại sau khi thử lại tối đa. */
    void publishActivityFailed(String sessionId, String activityId, List<String> reasons);

    /** Toàn bộ pipeline hoàn tất, giáo án đã được lưu. */
    void publishDone(String sessionId, UUID lessonPlanId);

    /** Pipeline thất bại chung (lỗi hệ thống / không sinh được khung / hỏng hết hoạt động). */
    void publishFailed(String sessionId, String message);
}
