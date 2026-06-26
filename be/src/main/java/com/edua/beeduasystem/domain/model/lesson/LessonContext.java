package com.edua.beeduasystem.domain.model.lesson;

import java.util.List;

/** Lightweight lesson context for slide generation (inline / mock plans). */
public record LessonContext(
        String id,
        String title,
        int grade,
        String summary,
        List<String> learningObjectives,
        List<Section> sections,
        List<KeyConcept> keyConcepts,
        List<Formula> formulas,
        List<Example> examples
) {
    public record Section(String heading, List<String> bullets) {
    }

    public record KeyConcept(String term, String definition) {
    }

    public record Formula(String latex, String meaning) {
    }

    public record Example(String prompt, String solution) {
    }
}
