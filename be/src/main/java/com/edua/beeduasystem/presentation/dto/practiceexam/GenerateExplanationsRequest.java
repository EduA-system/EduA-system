package com.edua.beeduasystem.presentation.dto.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;

import java.util.List;

public record GenerateExplanationsRequest(String bookCode, List<PracticeExam.Question> questions) {
}
