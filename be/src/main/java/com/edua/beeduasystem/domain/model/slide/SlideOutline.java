package com.edua.beeduasystem.domain.model.slide;

import java.util.List;

public record SlideOutline(String lessonId, String lessonTitle, List<SlidePart> parts) {
}
