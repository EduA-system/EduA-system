package com.edua.beeduasystem.presentation.advice;

import com.edua.beeduasystem.service.lessonplan.LessonPlanGenerationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String MSG13 =
            "Unsupported file type or file exceeds the maximum size. "
                    + "Allowed: .docx, .pdf, .pptx, .png, .jpg, .jpeg (max 10 MB).";

    public record ErrorResponse(String message) {
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(MSG13));
    }

    @ExceptionHandler(LessonPlanGenerationException.class)
    public ResponseEntity<ErrorResponse> handleLessonPlanGeneration(LessonPlanGenerationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }
}
