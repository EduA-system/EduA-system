package com.edua.beeduasystem.domain.model.slide;

import java.util.Map;

public final class SlideMetadata {

    private static final Map<String, String> KIND_TO_ROLE = Map.of(
            "intro", "hook",
            "concept", "explain",
            "formula", "derive",
            "example", "practice",
            "summary", "recap",
            "emulator", "practice"
    );

    private static final Map<String, String> KIND_TO_LAYOUT = Map.of(
            "intro", "title",
            "concept", "bullets",
            "formula", "formula",
            "example", "worked-example",
            "summary", "bullets",
            "emulator", "full-bleed"
    );

    private static final Map<String, String> ROLE_TO_KIND = Map.of(
            "hook", "intro",
            "explain", "concept",
            "derive", "formula",
            "practice", "example",
            "recap", "summary"
    );

    private static final Map<String, String> ROLE_TO_LAYOUT = Map.of(
            "hook", "title",
            "explain", "bullets",
            "derive", "formula",
            "practice", "worked-example",
            "recap", "bullets"
    );

    private SlideMetadata() {
    }

    public static Normalized normalize(String kind, String pedagogicalRole, String layoutHint) {
        String normalizedKind = clean(kind);
        String normalizedRole = clean(pedagogicalRole);
        String normalizedLayout = clean(layoutHint);
        boolean hasExplicitRole = normalizedRole != null;

        if (normalizedRole == null) {
            normalizedRole = KIND_TO_ROLE.getOrDefault(normalizedKind, normalizedKind);
        }
        if (normalizedRole == null) {
            normalizedRole = "explain";
        }

        if (normalizedLayout == null && hasExplicitRole) {
            normalizedLayout = ROLE_TO_LAYOUT.get(normalizedRole);
        }
        if (normalizedLayout == null) {
            normalizedLayout = KIND_TO_LAYOUT.get(normalizedKind);
        }
        if (normalizedLayout == null) {
            normalizedLayout = ROLE_TO_LAYOUT.get(normalizedRole);
        }

        if (normalizedKind == null) {
            normalizedKind = ROLE_TO_KIND.getOrDefault(normalizedRole, normalizedRole);
        } else if (hasExplicitRole && KIND_TO_ROLE.containsKey(normalizedKind)) {
            normalizedKind = ROLE_TO_KIND.getOrDefault(normalizedRole, normalizedKind);
        }

        return new Normalized(normalizedKind, normalizedRole, normalizedLayout);
    }

    private static String clean(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record Normalized(String kind, String pedagogicalRole, String layoutHint) {
    }
}
