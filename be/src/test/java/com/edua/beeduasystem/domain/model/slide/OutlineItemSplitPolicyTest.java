package com.edua.beeduasystem.domain.model.slide;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OutlineItemSplitPolicyTest {

    @Test
    void splitsTextImageItemWhenTextExceedsVisualBudget() {
        ContentPlan plan = new ContentPlan("text-image", "fixed", List.of(text("b1", "x".repeat(221)), visual("b2")), List.of());

        assertTrue(OutlineItemSplitPolicy.evaluate(plan).shouldSplit());
    }

    @Test
    void splitsItemWithTwoQuizBlocks() {
        ContentPlan plan = new ContentPlan("quiz", "fixed", List.of(quiz("q1"), quiz("q2")), List.of());

        assertTrue(OutlineItemSplitPolicy.evaluate(plan).shouldSplit());
    }

    @Test
    void keepsShortSingleIdeaItem() {
        ContentPlan plan = new ContentPlan("concept", "fixed", List.of(text("b1", "Dao động tắt dần có biên độ giảm theo thời gian.")), List.of());

        assertFalse(OutlineItemSplitPolicy.evaluate(plan).shouldSplit());
    }

    private static ContentPlan.TextBlock text(String id, String value) {
        return new ContentPlan.TextBlock(id, "text", "body", "explanation", "primary", true, null, value);
    }

    private static ContentPlan.VisualBlock visual(String id) {
        return new ContentPlan.VisualBlock(id, "visual", "illustration", "diagram", "supporting", false, null,
                "Đồ thị", "optional", "1:1", null);
    }

    private static ContentPlan.QuizBlock quiz(String id) {
        return new ContentPlan.QuizBlock(id, "quiz", "body", "question", "primary", true, null,
                "Câu hỏi?", List.of("A", "B", "C", "D"), "A", "Giải thích");
    }
}
