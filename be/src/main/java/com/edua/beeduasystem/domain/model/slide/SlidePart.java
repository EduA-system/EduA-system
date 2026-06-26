package com.edua.beeduasystem.domain.model.slide;

import java.util.List;

public record SlidePart(String id, String title, List<SlideItem> slides) {
}
