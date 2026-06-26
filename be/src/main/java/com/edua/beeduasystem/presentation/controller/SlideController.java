package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.GeneratePartsRequest;
import com.edua.beeduasystem.service.slides.GenerateSlideDeckUseCase;
import com.edua.beeduasystem.service.slides.GenerateSlideOutlineUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slides")
@RequiredArgsConstructor
@Tag(name = "Slides", description = "Sinh outline và slide deck từ giáo án")
public class SlideController {

    private final GenerateSlideOutlineUseCase generateSlideOutlineUseCase;
    private final GenerateSlideDeckUseCase generateSlideDeckUseCase;

    @PostMapping("/generate-outline")
    @Operation(summary = "Sinh đề cương slide từ giáo án inline")
    public GenerateOutlineResponse generateOutline(@RequestBody GenerateOutlineRequest request) {
        return generateSlideOutlineUseCase.execute(request);
    }

    @PostMapping("/generate-parts")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Bắt đầu sinh từng slide (async + STOMP)")
    public void generateParts(@RequestBody GeneratePartsRequest request) {
        generateSlideDeckUseCase.start(request);
    }
}
