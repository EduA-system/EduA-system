package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.RetryOutlinePartRequest;
import com.edua.beeduasystem.presentation.dto.slides.RetryOutlineSessionPartRequest;
import com.edua.beeduasystem.service.slides.GenerateSlideOutlineUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slides")
@RequiredArgsConstructor
@Tag(name = "Slides", description = "Sinh outline slide từ giáo án")
public class SlideController {

    private final GenerateSlideOutlineUseCase generateSlideOutlineUseCase;

    @PostMapping("/generate-outline")
    @Operation(summary = "Sinh đề cương slide từ giáo án inline")
    public GenerateOutlineResponse generateOutline(@RequestBody GenerateOutlineRequest request) {
        return generateSlideOutlineUseCase.execute(request);
    }

    @PostMapping("/outline-sessions/{sessionId}/start")
    @Operation(summary = "Bắt đầu sinh outline sau khi client đã subscribe STOMP")
    public void startOutlineSession(@org.springframework.web.bind.annotation.PathVariable String sessionId) {
        generateSlideOutlineUseCase.start(sessionId);
    }

    @PostMapping("/retry-outline-session-part")
    @Operation(summary = "Thử lại một part bằng snapshot của phiên tạo outline")
    public void retryOutlineSessionPart(@RequestBody RetryOutlineSessionPartRequest request) {
        generateSlideOutlineUseCase.retrySessionPart(request.sessionId(), request.partId());
    }

    @PostMapping("/retry-outline-part")
    @Operation(summary = "Thử lại soạn nội dung cho một phần của đề cương")
    public void retryOutlinePart(@RequestBody RetryOutlinePartRequest request) {
        generateSlideOutlineUseCase.retryPart(request);
    }
}
