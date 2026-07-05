package com.edua.beeduasystem.domain.exception;

/** Tài nguyên không tồn tại hoặc không còn hiển thị (vd bài blog đã bị gỡ/xóa). → 404. */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
