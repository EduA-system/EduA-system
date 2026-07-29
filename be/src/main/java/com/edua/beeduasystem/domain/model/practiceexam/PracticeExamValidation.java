package com.edua.beeduasystem.domain.model.practiceexam;

import java.util.List;

public record PracticeExamValidation(String status, double estimatedMinutes, double workingMinutes,
                                     double overrunMinutes, String message, List<Breakdown> breakdown) {
    public record Breakdown(String type, int count, double estimatedMinutes) {}
}
