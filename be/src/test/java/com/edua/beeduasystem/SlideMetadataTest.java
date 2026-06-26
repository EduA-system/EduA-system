package com.edua.beeduasystem;

import com.edua.beeduasystem.domain.model.slide.SlideMetadata;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SlideMetadataTest {

    @Test
    void mapsLegacyKindToRoleAndLayout() {
        SlideMetadata.Normalized normalized = SlideMetadata.normalize("formula", null, null);

        assertEquals("formula", normalized.kind());
        assertEquals("derive", normalized.pedagogicalRole());
        assertEquals("formula", normalized.layoutHint());
    }

    @Test
    void preservesUnknownRoleWithoutCoercingToConcept() {
        SlideMetadata.Normalized normalized = SlideMetadata.normalize(null, "compare", "comparison");

        assertEquals("compare", normalized.kind());
        assertEquals("compare", normalized.pedagogicalRole());
        assertEquals("comparison", normalized.layoutHint());
    }

    @Test
    void letsExplicitRoleWinOverLegacyKindAlias() {
        SlideMetadata.Normalized normalized = SlideMetadata.normalize("concept", "practice", null);

        assertEquals("example", normalized.kind());
        assertEquals("practice", normalized.pedagogicalRole());
        assertEquals("worked-example", normalized.layoutHint());
    }
}
