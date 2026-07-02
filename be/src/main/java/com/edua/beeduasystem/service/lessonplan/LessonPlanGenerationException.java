package com.edua.beeduasystem.service.lessonplan;

/**
 * Lỗi trong quá trình sinh giáo án bằng AI (provider lỗi hoặc parse output thất bại).
 * Map sang 502 Bad Gateway ở {@code GlobalExceptionHandler}.
 */
public class LessonPlanGenerationException extends RuntimeException {

    public LessonPlanGenerationException(String message, Throwable cause) {
        super(message, cause);
    }
}
