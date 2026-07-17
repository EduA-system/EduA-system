package com.edua.beeduasystem.domain.model.slide;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Decides whether a completed outline item must be divided before slide design begins. */
public final class OutlineItemSplitPolicy {

    private static final int TEXT_WITH_VISUAL_MAX_CHARS = 220;
    private static final int STANDARD_MAX_CHARS = 320;
    private static final int COMPARISON_MAX_CHARS = 420;
    private static final int TEXT_ONLY_MAX_CHARS = 450;
    private static final int TABLE_MAX_CHARS = 500;
    private static final int TABLE_CELL_MAX_CHARS = 90;
    private static final int MAX_BULLETS = 6;

    private OutlineItemSplitPolicy() {
    }

    public static Decision evaluate(ContentPlan plan) {
        if (plan == null || "intro".equals(plan.slideType()) || "section".equals(plan.slideType())) {
            return Decision.keep();
        }

        Metrics metrics = Metrics.from(plan);
        Set<String> reasons = new LinkedHashSet<>();
        if (metrics.quizCount >= 2) reasons.add("Có từ hai câu hỏi trắc nghiệm trở lên");
        if (metrics.bulletCount > MAX_BULLETS) reasons.add("Có quá sáu gạch đầu dòng");
        if (metrics.hasVisual && metrics.characters > TEXT_WITH_VISUAL_MAX_CHARS) {
            reasons.add("Slide có hình minh hoạ nhưng phần chữ vượt 220 ký tự");
        }
        if (Set.of("concept", "text-image", "experiment").contains(plan.slideType())
                && metrics.characters > STANDARD_MAX_CHARS) {
            reasons.add("Slide nội dung vượt 320 ký tự");
        }
        if ("comparison".equals(plan.slideType()) && metrics.characters > COMPARISON_MAX_CHARS) {
            reasons.add("Slide so sánh vượt 420 ký tự");
        }
        if ("table".equals(plan.slideType())
                && (metrics.characters > TABLE_MAX_CHARS || metrics.longestTableCell > TABLE_CELL_MAX_CHARS)) {
            reasons.add("Bảng quá dày: tổng vượt 500 ký tự hoặc có ô vượt 90 ký tự");
        }
        if (!metrics.hasVisual && metrics.characters > TEXT_ONLY_MAX_CHARS) {
            reasons.add("Slide chỉ có chữ vượt 450 ký tự");
        }
        return new Decision(!reasons.isEmpty(), List.copyOf(reasons));
    }

    public record Decision(boolean shouldSplit, List<String> reasons) {
        public Decision {
            reasons = List.copyOf(reasons);
        }

        private static Decision keep() {
            return new Decision(false, List.of());
        }
    }

    private record Metrics(int characters, int bulletCount, int quizCount, int longestTableCell, boolean hasVisual) {
        private static Metrics from(ContentPlan plan) {
            List<String> text = new ArrayList<>();
            int bullets = 0;
            int quizzes = 0;
            int longestCell = 0;
            boolean visual = false;
            for (ContentPlan.Block block : plan.blocks()) {
                if (block instanceof ContentPlan.TextBlock item) {
                    text.add(item.text());
                    bullets += countBullets(item.text());
                } else if (block instanceof ContentPlan.VisualBlock) {
                    visual = true;
                } else if (block instanceof ContentPlan.ComparisonBlock item) {
                    item.items().forEach(label -> text.add(label.label()));
                    item.criteria().forEach(label -> text.add(label.label()));
                    item.values().forEach(text::addAll);
                } else if (block instanceof ContentPlan.TableBlock item) {
                    item.columns().forEach(label -> text.add(label.label()));
                    for (ContentPlan.TableRow row : item.rows()) {
                        text.addAll(row.cells());
                        for (String cell : row.cells()) longestCell = Math.max(longestCell, length(cell));
                    }
                } else if (block instanceof ContentPlan.SequenceBlock item) {
                    for (ContentPlan.Step step : item.steps()) {
                        text.add(step.label());
                        text.add(step.text());
                    }
                } else if (block instanceof ContentPlan.FormulaBlock item) {
                    text.add(item.expression());
                    text.add(item.explanation());
                } else if (block instanceof ContentPlan.QuizBlock item) {
                    quizzes++;
                    text.add(item.question());
                    text.addAll(item.choices());
                    text.add(item.answer());
                    text.add(item.explanation());
                }
            }
            return new Metrics(text.stream().mapToInt(Metrics::length).sum(), bullets, quizzes, longestCell, visual);
        }

        private static int countBullets(String value) {
            if (value == null || value.isBlank()) return 0;
            return (int) value.lines().filter(line -> line.trim().matches("(?:[•*\\-–]\\s+.*|\\d+[.)]\\s+.*)")).count();
        }

        private static int length(String value) {
            return value == null ? 0 : value.trim().length();
        }
    }
}
