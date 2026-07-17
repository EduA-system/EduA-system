package com.edua.beeduasystem.presentation.dto.slidedesign;

public record SlideContentStyleResponse(
        Integer fontSize,
        String color,
        Boolean bold,
        Boolean italic,
        String align
) {}
