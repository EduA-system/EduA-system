package com.edua.beeduasystem.presentation.dto.lessonplan;

/**
 * Yêu cầu sinh giáo án 5512 từ một bài đã chọn trong catalog SGK.
 *
 * <p>{@code bookId/chapterId/lessonId} là {@code code} trong catalog (BR-07).
 * {@code userPrompt} optional — Additional Objectives / yêu cầu tùy chỉnh của GV.
 */
public record GenerateLessonPlanRequest(
        String bookId,
        String chapterId,
        String lessonId,
        String userPrompt
) {
}
