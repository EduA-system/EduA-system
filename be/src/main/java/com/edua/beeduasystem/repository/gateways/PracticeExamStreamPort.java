package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;

import java.util.List;

/**
 * Gateway contract để đẩy tiến trình sinh đề kiểm tra về client (qua STOMP).
 *
 * <p>Nằm ở {@code repository/gateways/} cùng {@link LessonPlanStreamPort}/{@code AiClient}:
 * interface kỹ thuật thuần, không phụ thuộc transport cụ thể. Implementation STOMP nằm ở
 * {@code infrastructure/messaging/}.
 *
 * <p>Thứ tự sự kiện kỳ vọng: {@code PLAN_READY} đầu tiên → nhiều × ({@code BATCH_READY} |
 * {@code BATCH_FAILED}) → kết thúc bằng {@code DONE} (thành công) hoặc {@code ERROR} (thất bại).
 */
public interface PracticeExamStreamPort {

    /** Khung câu hỏi (order/loại/điểm mọi câu) đã tính xong, trước khi gọi AI. */
    void publishPlanReady(String sessionId, String title, String instructions, int durationMinutes,
                          int totalScoreCentiPoints, List<PracticeExamEvent.QuestionStub> stubs);

    /** Một batch câu hỏi (có thể nhiều câu) đã sinh xong thành công. */
    void publishBatchReady(String sessionId, List<PracticeExam.Question> questions);

    /** Một batch sinh thất bại sau khi thử lại tối đa. */
    void publishBatchFailed(String sessionId, List<Integer> orders, String reason);

    /** Toàn bộ đề đã sinh xong. */
    void publishDone(String sessionId);

    /** Pipeline thất bại chung (lỗi hệ thống / không sinh được khung / hỏng hết). */
    void publishFailed(String sessionId, String message);
}
