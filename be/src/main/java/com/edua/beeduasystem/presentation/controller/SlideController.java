package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
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
}
