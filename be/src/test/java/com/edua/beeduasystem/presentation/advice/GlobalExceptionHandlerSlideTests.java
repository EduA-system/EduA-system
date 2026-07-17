package com.edua.beeduasystem.presentation.advice;

import com.edua.beeduasystem.service.slides.SlideAiResponseException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerSlideTests {

    @Test
    void mapsInvalidAiSlideResponseToBadGateway() {
        var response = new GlobalExceptionHandler().handleSlideAiResponse(
                new SlideAiResponseException("merge-outline lỗi", null));

        assertEquals(HttpStatus.BAD_GATEWAY, response.getStatusCode());
        assertEquals("merge-outline lỗi", response.getBody().message());
    }
}
