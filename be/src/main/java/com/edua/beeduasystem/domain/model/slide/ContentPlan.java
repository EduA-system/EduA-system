package com.edua.beeduasystem.domain.model.slide;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Semantic slide content. It deliberately contains no geometry or styling. */
public record ContentPlan(
        String slideType,
        String headerMode,
        List<Block> blocks,
        List<Relationship> relationships) {

    private static final Set<String> SLIDE_TYPES = Set.of(
            "intro", "section", "concept", "text-image", "experiment", "comparison", "table",
            "process", "formula", "exercise", "quiz", "summary");

    public ContentPlan {
        if (!SLIDE_TYPES.contains(slideType)) throw new IllegalArgumentException("Unknown slideType: " + slideType);
        if (!("fixed".equals(headerMode) || "hidden".equals(headerMode))) {
            throw new IllegalArgumentException("headerMode must be fixed or hidden");
        }
        blocks = blocks == null ? List.of() : List.copyOf(blocks);
        relationships = relationships == null ? List.of() : List.copyOf(relationships);
        validate(blocks, relationships);
    }

    private static void validate(List<Block> blocks, List<Relationship> relationships) {
        Set<String> ids = new HashSet<>();
        for (Block block : blocks) {
            if (block == null || block.id() == null || block.id().isBlank()) throw new IllegalArgumentException("Block id is required");
            if (!ids.add(block.id())) throw new IllegalArgumentException("Duplicate block id: " + block.id());
            if (block instanceof ComparisonBlock comparison) {
                if (comparison.items().size() < 2 || comparison.criteria().isEmpty()) throw new IllegalArgumentException("Comparison needs items and criteria");
                if (comparison.values().size() != comparison.criteria().size()
                        || comparison.values().stream().anyMatch(row -> row.size() != comparison.items().size())) {
                    throw new IllegalArgumentException("Comparison matrix has invalid dimensions");
                }
            }
            if (block instanceof TableBlock table
                    && table.rows().stream().anyMatch(row -> row.cells().size() != table.columns().size())) {
                throw new IllegalArgumentException("Table row has invalid cell count");
            }
        }
        for (Relationship relationship : relationships) {
            for (String reference : relationship.references()) {
                if (!ids.contains(reference)) throw new IllegalArgumentException("Relationship references unknown block: " + reference);
            }
        }
    }

    public sealed interface Block permits TextBlock, VisualBlock, MoleculeBlock, PeriodicBlock, ComparisonBlock, TableBlock, SequenceBlock, FormulaBlock, QuizBlock {
        String id();
        String kind();
        String role();
        String semanticType();
        String priority();
        boolean required();
        String groupId();
    }

    public record TextBlock(String id, String kind, String role, String semanticType, String priority,
                            boolean required, String groupId, String text) implements Block {}

    public record VisualBlock(String id, String kind, String role, String semanticType, String priority,
                              boolean required, String groupId, String description, String requirement,
                              String preferredAspectRatio, String illustratesBlockId) implements Block {}

    // Hoá học only (enforced by the outline prompt): a 3D molecule model to build via MoleculeService.
    public record MoleculeBlock(String id, String kind, String role, String semanticType, String priority,
                                boolean required, String groupId, String chemicalRequest) implements Block {}

    // Chemistry only (enforced by the outline prompt): periodic-table or element data resolved locally by the frontend.
    public record PeriodicBlock(String id, String kind, String role, String semanticType, String priority,
                                boolean required, String groupId, String periodicRequest, String mode,
                                List<String> elementSymbols, String focus) implements Block {
        public PeriodicBlock { elementSymbols = elementSymbols == null ? List.of() : List.copyOf(elementSymbols); }
    }

    public record ComparisonBlock(String id, String kind, String role, String semanticType, String priority,
                                  boolean required, String groupId, List<Label> items, List<Label> criteria,
                                  List<List<String>> values, String preferredPresentation) implements Block {
        public ComparisonBlock { items = List.copyOf(items); criteria = List.copyOf(criteria); values = values.stream().map(List::copyOf).toList(); }
    }

    public record TableBlock(String id, String kind, String role, String semanticType, String priority,
                             boolean required, String groupId, List<Label> columns, List<TableRow> rows) implements Block {
        public TableBlock { columns = List.copyOf(columns); rows = List.copyOf(rows); }
    }

    public record SequenceBlock(String id, String kind, String role, String semanticType, String priority,
                                boolean required, String groupId, List<Step> steps) implements Block {
        public SequenceBlock { steps = List.copyOf(steps); }
    }

    public record FormulaBlock(String id, String kind, String role, String semanticType, String priority,
                               boolean required, String groupId, String expression, String explanation) implements Block {}

    public record QuizBlock(String id, String kind, String role, String semanticType, String priority,
                            boolean required, String groupId, String question, List<String> choices,
                            String answer, String explanation) implements Block {
        public QuizBlock { choices = choices == null ? List.of() : List.copyOf(choices); }
    }

    public record Label(String id, String label) {}
    public record TableRow(String id, List<String> cells) { public TableRow { cells = List.copyOf(cells); } }
    public record Step(String id, String label, String text) {}

    public record Relationship(String type, String visualBlockId, String supportingBlockId,
                               String targetBlockId, String beforeBlockId, String afterBlockId) {
        public List<String> references() {
            return switch (type) {
                case "illustrates" -> List.of(required(visualBlockId), required(targetBlockId));
                case "supports" -> List.of(required(supportingBlockId), required(targetBlockId));
                case "follows" -> List.of(required(beforeBlockId), required(afterBlockId));
                default -> throw new IllegalArgumentException("Unknown relationship type: " + type);
            };
        }

        private static String required(String value) {
            if (value == null || value.isBlank()) throw new IllegalArgumentException("Relationship reference is required");
            return value;
        }
    }
}

