package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignResponse;
import com.edua.beeduasystem.service.slidedesign.GenerateSlideHtmlDesignUseCase;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/slide-design")
@RequiredArgsConstructor
public class SlideDesignController {

    private final GenerateSlideHtmlDesignUseCase generateSlideHtmlDesignUseCase;

    @PostMapping("/generate-html")
    public SlideHtmlDesignResponse generateHtml(@RequestBody SlideHtmlDesignRequest req) {
        return generateSlideHtmlDesignUseCase.execute(req);
    }
}
