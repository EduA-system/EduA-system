package com.edua.beeduasystem.presentation.dto.slides;

public record SlideItemDto(String id, String title, String kind, String pedagogicalRole, String layoutHint) {

    public SlideItemDto {
        var normalized = com.edua.beeduasystem.domain.model.slide.SlideMetadata.normalize(
                kind, pedagogicalRole, layoutHint);
        kind = normalized.kind();
        pedagogicalRole = normalized.pedagogicalRole();
        layoutHint = normalized.layoutHint();
    }

    public SlideItemDto(String id, String title, String kind) {
        this(id, title, kind, null, null);
    }
}
