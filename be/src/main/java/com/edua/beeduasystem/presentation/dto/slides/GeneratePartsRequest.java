package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record GeneratePartsRequest(
        String sessionId,
        String lessonId,
        String lessonTitle,
        String lessonSummary,
        String grade,
        List<PartDto> parts,
        String userPrompt,
        String styleHint
) {
}
