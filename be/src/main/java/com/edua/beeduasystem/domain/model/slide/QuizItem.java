package com.edua.beeduasystem.domain.model.slide;

import java.util.List;

public record QuizItem(String question, List<String> choices, String answer, String explanation) {
}
