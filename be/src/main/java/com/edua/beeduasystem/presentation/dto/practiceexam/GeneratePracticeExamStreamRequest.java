package com.edua.beeduasystem.presentation.dto.practiceexam;

/**
 * Yêu cầu sinh đề kiểm tra theo kiểu STREAMING (async + STOMP).
 *
 * <p>Kèm {@code sessionId} do FE sinh để client subscribe topic
 * {@code /topic/practice-exam/{sessionId}} và nhận tiến trình (PLAN_READY →
 * nhiều × BATCH_READY/BATCH_FAILED → DONE/ERROR). Endpoint trả 202 ngay, công
 * việc sinh chạy nền trên virtual-thread executor.
 *
 * <p>Bọc {@link PracticeExamRequest} thay vì làm phẳng (khác
 * {@code GenerateLessonPlanStreamRequest}) vì record không kế thừa được field
 * và {@link PracticeExamRequest} đã có 11 field — bọc gọn hơn lặp lại toàn bộ.
 */
public record GeneratePracticeExamStreamRequest(String sessionId, PracticeExamRequest request) {
}
