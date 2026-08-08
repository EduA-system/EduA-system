package com.edua.beeduasystem.repository.gateways;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import java.util.List;

/**
 * Envelope sự kiện đẩy về client khi sinh đề kiểm tra STREAMING. Sealed interface với 5
 * biến thể, phân biệt bằng trường {@code type} khi serialize ra JSON.
 *
 * <p>Khác {@link LessonPlanEvent}: mỗi batch có thể gồm NHIỀU câu hỏi (TN batch=5 câu,
 * Đúng-sai=2, Trả lời ngắn=3, Tự luận=1), nên {@code BatchReady}/{@code BatchFailed} mang
 * một danh sách order/câu hỏi thay vì đúng 1 activity/event như giáo án 5512.
 *
 * <p>Thứ tự sự kiện: {@code PLAN_READY} (khung câu hỏi: order/loại/điểm từng câu, tính được
 * ngay khi nhận request, không cần gọi AI) → nhiều × ({@code BATCH_READY} | {@code BATCH_FAILED})
 * → {@code DONE} (hoặc {@code ERROR} nếu hỏng ngay từ đầu).
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = PracticeExamEvent.PlanReady.class, name = "PLAN_READY"),
        @JsonSubTypes.Type(value = PracticeExamEvent.BatchReady.class, name = "BATCH_READY"),
        @JsonSubTypes.Type(value = PracticeExamEvent.BatchFailed.class, name = "BATCH_FAILED"),
        @JsonSubTypes.Type(value = PracticeExamEvent.Done.class, name = "DONE"),
        @JsonSubTypes.Type(value = PracticeExamEvent.Error.class, name = "ERROR")
})
public sealed interface PracticeExamEvent {

    String sessionId();

    /** Câu hỏi dự kiến trong đề: order/loại/điểm — chưa có nội dung, dùng để dựng khung "đang soạn". */
    record QuestionStub(int order, String type, int scoreCentiPoints) {
    }

    /** Khung đề (order/loại/điểm mọi câu) sẵn sàng ngay khi kickoff, trước khi gọi AI. */
    record PlanReady(String sessionId, String title, String instructions, int durationMinutes,
                     int totalScoreCentiPoints, List<QuestionStub> stubs) implements PracticeExamEvent {
    }

    /** Một batch câu hỏi sinh xong thành công (có thể gồm nhiều câu). */
    record BatchReady(String sessionId, List<PracticeExam.Question> questions) implements PracticeExamEvent {
    }

    /** Một batch sinh thất bại sau khi thử lại tối đa — mọi order trong batch đều failed. */
    record BatchFailed(String sessionId, List<Integer> orders, String reason) implements PracticeExamEvent {
    }

    /** Toàn bộ đề đã sinh xong (mọi batch đã về, dù thành công hay lỗi). */
    record Done(String sessionId) implements PracticeExamEvent {
    }

    /** Pipeline thất bại chung (validate lỗi, hoặc lỗi hệ thống). */
    record Error(String sessionId, String message) implements PracticeExamEvent {
    }
}
