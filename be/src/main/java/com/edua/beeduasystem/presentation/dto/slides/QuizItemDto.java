package com.edua.beeduasystem.presentation.dto.slides;

import java.util.List;

public record QuizItemDto(String question, List<String> choices, String answer, String explanation) {
}
