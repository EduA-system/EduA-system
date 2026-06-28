package com.edua.beeduasystem.domain.model.slide;

public record SlideItem(String id, String title, String kind, String pedagogicalRole, String layoutHint,
                        String content, SlideVisual visual) {

    public SlideItem {
        SlideMetadata.Normalized normalized = SlideMetadata.normalize(kind, pedagogicalRole, layoutHint);
        kind = normalized.kind();
        pedagogicalRole = normalized.pedagogicalRole();
        layoutHint = normalized.layoutHint();
    }

    public SlideItem(String id, String title, String kind, String pedagogicalRole, String layoutHint) {
        this(id, title, kind, pedagogicalRole, layoutHint, null, null);
    }

    public SlideItem(String id, String title, String kind) {
        this(id, title, kind, null, null, null, null);
    }
}
