package com.edua.beeduasystem.presentation.dto.practiceexam;

import java.util.List;

public record GenerateExplanationsResponse(List<ExplanationEntry> explanations) {
    public record ExplanationEntry(int order, String explanation) {}
}
