package com.edua.beeduasystem.domain.exception;

/** Raised when a teacher's optional lesson-plan request is outside the supported scope. */
public class InvalidLessonPlanAdditionalRequestException extends RuntimeException {
    public InvalidLessonPlanAdditionalRequestException(String message) {
        super(message);
    }
}
