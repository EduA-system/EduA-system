package com.edua.beeduasystem.service.slides;

/** Signals an unusable AI response, as distinct from invalid client input. */
public class SlideAiResponseException extends RuntimeException {
    public SlideAiResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
