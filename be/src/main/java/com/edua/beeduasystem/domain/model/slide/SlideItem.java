package com.edua.beeduasystem.domain.model.slide;

public record SlideItem(String id, String title, String kind, String pedagogicalRole, String layoutHint) {

    public SlideItem {
        SlideMetadata.Normalized normalized = SlideMetadata.normalize(kind, pedagogicalRole, layoutHint);
        kind = normalized.kind();
        pedagogicalRole = normalized.pedagogicalRole();
        layoutHint = normalized.layoutHint();
    }

    public SlideItem(String id, String title, String kind) {
        this(id, title, kind, null, null);
    }
}
