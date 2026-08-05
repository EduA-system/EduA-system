package com.edua.beeduasystem.presentation.advice;

import com.edua.beeduasystem.domain.exception.BulkEnrollmentFailedException;
import com.edua.beeduasystem.domain.exception.ClassEnrollmentConflictException;
import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.EmailNotAllowedException;
import com.edua.beeduasystem.domain.exception.ClassAccessRevokedException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.InvalidTokenException;
import com.edua.beeduasystem.domain.exception.MoleculeBuildException;
import com.edua.beeduasystem.domain.exception.PracticeExamGenerationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.service.lessonplan.LessonPlanGenerationException;
import com.edua.beeduasystem.service.slides.SlideAiResponseException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String MSG13 =
            "Unsupported file type or file exceeds the maximum size. "
                    + "Allowed: .docx, .pdf, .pptx, .png, .jpg, .jpeg (max 10 MB).";

    public record ErrorResponse(String message, String code) {
        public ErrorResponse(String message) {
            this(message, null);
        }
    }

    /** 409 them hoc sinh: kèm mã lý do + (khi PROFILE_MISMATCH) thông tin tài khoản cũ để FE xác nhận. */
    public record ClassEnrollmentConflictResponse(String message, String reason, Object existingAccount) {
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Dữ liệu không hợp lệ.")
                .orElse("Dữ liệu không hợp lệ.");
        return ResponseEntity.badRequest().body(new ErrorResponse(message));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(MoleculeBuildException.class)
    public ResponseEntity<ErrorResponse> handleMoleculeBuild(MoleculeBuildException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(MSG13));
    }

    @ExceptionHandler(LessonPlanGenerationException.class)
    public ResponseEntity<ErrorResponse> handleLessonPlanGeneration(LessonPlanGenerationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(SlideAiResponseException.class)
    public ResponseEntity<ErrorResponse> handleSlideAiResponse(SlideAiResponseException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(PracticeExamGenerationException.class)
    public ResponseEntity<ErrorResponse> handlePracticeExamGeneration(PracticeExamGenerationException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidToken(InvalidTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(EmailNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotAllowed(EmailNotAllowedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenOperationException.class)
    public ResponseEntity<ErrorResponse> handleForbiddenOperation(ForbiddenOperationException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(ClassAccessRevokedException.class)
    public ResponseEntity<ErrorResponse> handleClassAccessRevoked(ClassAccessRevokedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(ex.getMessage(), "CLASS_ACCESS_REVOKED"));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(ex.getMessage()));
    }

    @ExceptionHandler(ClassEnrollmentConflictException.class)
    public ResponseEntity<?> handleClassEnrollmentConflict(ClassEnrollmentConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ClassEnrollmentConflictResponse(ex.getMessage(), ex.reason(), ex.details()));
    }

    @ExceptionHandler(BulkEnrollmentFailedException.class)
    public ResponseEntity<ErrorResponse> handleBulkEnrollmentFailed(BulkEnrollmentFailedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(ex.getMessage()));
    }
}
