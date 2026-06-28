package com.edua.beeduasystem.presentation.dto.slides;

public record SlideItemDto(String id, String title, String kind, String pedagogicalRole, String layoutHint,
                           String content, Integer durationMinutes, VisualDto visual, String aiNote) {

    public SlideItemDto {
        var normalized = com.edua.beeduasystem.domain.model.slide.SlideMetadata.normalize(
                kind, pedagogicalRole, layoutHint);
        kind = normalized.kind();
        pedagogicalRole = normalized.pedagogicalRole();
        layoutHint = normalized.layoutHint();
    }

    public SlideItemDto(String id, String title, String kind, String pedagogicalRole, String layoutHint,
                        String content, Integer durationMinutes) {
        this(id, title, kind, pedagogicalRole, layoutHint, content, durationMinutes, null, null);
    }

    public SlideItemDto(String id, String title, String kind, String pedagogicalRole, String layoutHint,
                        String content) {
        this(id, title, kind, pedagogicalRole, layoutHint, content, null, null, null);
    }

    public SlideItemDto(String id, String title, String kind, String pedagogicalRole, String layoutHint) {
        this(id, title, kind, pedagogicalRole, layoutHint, null, null, null, null);
    }

    public SlideItemDto(String id, String title, String kind) {
        this(id, title, kind, null, null, null, null, null, null);
    }
}
