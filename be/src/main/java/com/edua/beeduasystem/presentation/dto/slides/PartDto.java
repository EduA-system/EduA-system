package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record PartDto(String id, String title, List<SlideItemDto> slides) {
}
