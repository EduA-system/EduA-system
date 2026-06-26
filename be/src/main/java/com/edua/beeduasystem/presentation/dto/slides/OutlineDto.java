package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record OutlineDto(String lessonId, String lessonTitle, List<PartDto> parts) {
}
