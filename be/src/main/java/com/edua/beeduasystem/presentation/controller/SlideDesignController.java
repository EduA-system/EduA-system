package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignResponse;
import com.edua.beeduasystem.service.slidedesign.GenerateSlideHtmlDesignUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillResponse;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideImageGenerateRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideImageGenerateResponse;
import com.edua.beeduasystem.service.slidedesign.FillSlideContentUseCase;
import com.edua.beeduasystem.service.slidedesign.GenerateSlideImageUseCase;

@RestController
@RequestMapping("/api/slide-design")
@RequiredArgsConstructor
public class SlideDesignController {

    private final GenerateSlideHtmlDesignUseCase generateSlideHtmlDesignUseCase;
    private final FillSlideContentUseCase fillSlideContentUseCase;
    private final GenerateSlideImageUseCase generateSlideImageUseCase;

    @PostMapping("/generate-html")
    public SlideHtmlDesignResponse generateHtml(@RequestBody SlideHtmlDesignRequest req) {
        return generateSlideHtmlDesignUseCase.execute(req);
    }

    @PostMapping("/fill-content")
    public SlideContentFillResponse fillContent(@RequestBody SlideContentFillRequest req) {
        return fillSlideContentUseCase.execute(req);
    }

    /** Tạo lại một ảnh minh hoạ lẻ cho slot bị lỗi, gọi từ nút "tạo lại ảnh" trong slide editor. */
    @PostMapping("/generate-image")
    public SlideImageGenerateResponse generateImage(@RequestBody SlideImageGenerateRequest req) {
        return generateSlideImageUseCase.execute(req);
    }
}
