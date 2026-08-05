package com.edua.beeduasystem.domain.exception;

/** Khi học sinh bị xóa khỏi lớp và cố truy cập lớp đó. → 403 + code CLASS_ACCESS_REVOKED. */
public class ClassAccessRevokedException extends RuntimeException {
    public ClassAccessRevokedException() {
        super("Bạn không còn quyền truy cập lớp học này.");
    }
}
