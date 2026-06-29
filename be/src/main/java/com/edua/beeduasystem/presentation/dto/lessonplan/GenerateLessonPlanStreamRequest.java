package com.edua.beeduasystem.presentation.dto.lessonplan;

/**
 * Yêu cầu sinh giáo án 5512 theo kiểu STREAMING (async + STOMP).
 *
 * <p>Khác {@link GenerateLessonPlanRequest}: kèm {@code sessionId} do FE sinh để
 * client subscribe topic {@code /topic/lesson-plan/{sessionId}} và nhận tiến trình
 * (FRAME_READY → ACTIVITY_READY/ACTIVITY_FAILED → DONE/ERROR). Endpoint trả 202
 * ngay, công việc sinh chạy nền trên virtual-thread executor.
 */
public record GenerateLessonPlanStreamRequest(
        String sessionId,
        String bookId,
        String chapterId,
        String lessonId,
        String userPrompt
) {
}
