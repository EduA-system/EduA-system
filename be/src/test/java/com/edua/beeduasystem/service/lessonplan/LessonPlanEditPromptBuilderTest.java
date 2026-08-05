package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest.SectionInput;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LessonPlanEditPromptBuilderTest {

    private final LessonPlanEditPromptBuilder builder = new LessonPlanEditPromptBuilder();

    @Test
    void includesTableConventionAndPerKindRulesRegardlessOfRequestedSections() {
        String prompt = builder.buildPrompt(new EditLessonSectionRequest(
                "làm ngắn gọn",
                List.of(new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung", "text"))));

        assertTrue(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"), "phải luôn có quy ước bảng dùng chung");
        assertTrue(prompt.contains("kind \"materials\""), "phải luôn có hướng dẫn cho kind materials");
        assertTrue(prompt.contains("kind \"subActivity\""), "phải luôn có hướng dẫn cho kind subActivity");
    }

    @Test
    void threadsSectionKindIntoSectionBlock() {
        String prompt = builder.buildPrompt(new EditLessonSectionRequest(
                "thêm thiết bị",
                List.of(new SectionInput("sec-2", "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "‖ A ‖ B ‖\n| 1 | 2 |", "materials"))));

        assertTrue(prompt.contains("kind: materials"));
    }

    @Test
    void defaultsMissingKindToText() {
        String prompt = builder.buildPrompt(new EditLessonSectionRequest(
                "sửa",
                List.of(new SectionInput("sec-3", "I. MỤC TIÊU", "Nội dung", null))));

        assertTrue(prompt.contains("kind: text"));
        assertFalse(prompt.contains("kind: null"));
    }
}
