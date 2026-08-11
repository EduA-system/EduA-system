package com.edua.beeduasystem.domain.exception;

public class StateConflictException extends RuntimeException {
    public StateConflictException(String message) {
        super(message);
    }
}
