package com.edua.beeduasystem.service.slides;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Deterministically splits structured lesson text without dropping source characters. */
@Service
public class LessonContentChunker {

    public static final int DEFAULT_TARGET_SIZE = 9_000;
    public static final int DEFAULT_MAX_SIZE = 12_000;
    private static final Pattern HEADING = Pattern.compile("^(#{1,6})\\s+(.+?)\\s*(?:\\r?\\n)?$");
    private static final Pattern LIST_ITEM = Pattern.compile("^(\\s*)(?:[-+*]|\\d+[.)])\\s+.*");
    private static final Pattern SENTENCE_END = Pattern.compile("[.!?…](?:[\\\"'”’)]*)\\s+");

    private final int targetSize;
    private final int maxSize;

    public LessonContentChunker() {
        this(DEFAULT_TARGET_SIZE, DEFAULT_MAX_SIZE);
    }

    LessonContentChunker(int targetSize, int maxSize) {
        if (targetSize <= 0 || maxSize < targetSize) throw new IllegalArgumentException("Giới hạn chunk không hợp lệ.");
        this.targetSize = targetSize;
        this.maxSize = maxSize;
    }

    public List<Chunk> chunk(String source) {
        if (source == null || source.isBlank()) throw new IllegalArgumentException("Nội dung giáo án đang trống.");
        String normalized = source;
        List<Unit> units = splitUnits(normalized);
        List<Chunk> chunks = new ArrayList<>();
        List<String> headingPath = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        List<String> currentPath = List.of();

        for (Unit unit : units) {
            Matcher heading = HEADING.matcher(firstLine(unit.text()));
            if (heading.matches()) updateHeadingPath(headingPath, heading.group(1).length(), heading.group(2));
            List<String> pieces = splitOversized(unit, headingPath);
            for (String piece : pieces) {
                if (current.isEmpty()) currentPath = List.copyOf(headingPath);
                if (!current.isEmpty() && current.length() + piece.length() > targetSize) {
                    chunks.add(toChunk(chunks.size(), current.toString(), currentPath));
                    current.setLength(0);
                    currentPath = List.copyOf(headingPath);
                }
                if (current.length() + piece.length() > maxSize) {
                    throw tooLarge(headingPath, unit.kind());
                }
                current.append(piece);
            }
        }
        if (!current.isEmpty()) chunks.add(toChunk(chunks.size(), current.toString(), currentPath));
        String reconstructed = chunks.stream().map(Chunk::sourceText).reduce("", String::concat);
        if (!normalized.equals(reconstructed)) throw new IllegalStateException("Chunking đã làm mất hoặc thay đổi nội dung nguồn.");
        return List.copyOf(chunks);
    }

    private List<String> splitOversized(Unit unit, List<String> headingPath) {
        if (unit.text().length() <= maxSize) return List.of(unit.text());
        if (unit.atomic()) throw tooLarge(headingPath, unit.kind());
        List<String> pieces = new ArrayList<>();
        int start = 0;
        while (unit.text().length() - start > maxSize) {
            int limit = start + maxSize;
            Matcher matcher = SENTENCE_END.matcher(unit.text());
            matcher.region(start, unit.text().length());
            int cut = -1;
            while (matcher.find() && matcher.end() <= limit) cut = matcher.end();
            if (cut <= start) {
                throw new IllegalArgumentException("Đoạn văn quá dài và không có ranh giới câu dưới heading '"
                        + headingLabel(headingPath) + "'. Hãy tách đoạn này thành các câu ngắn hơn.");
            }
            pieces.add(unit.text().substring(start, cut));
            start = cut;
        }
        if (start < unit.text().length()) pieces.add(unit.text().substring(start));
        return pieces;
    }

    private IllegalArgumentException tooLarge(List<String> headingPath, String kind) {
        return new IllegalArgumentException("Khối " + kind.toLowerCase(Locale.ROOT) + " vượt quá " + maxSize
                + " ký tự dưới heading '" + headingLabel(headingPath) + "'. Hãy chia nhỏ khối này.");
    }

    private static String headingLabel(List<String> path) {
        return path.isEmpty() ? "(đầu tài liệu)" : String.join(" > ", path);
    }

    private static Chunk toChunk(int index, String sourceText, List<String> headingPath) {
        String id = "c" + (index + 1);
        String context = headingPath.isEmpty() ? "" : "ĐƯỜNG DẪN HEADING: " + String.join(" > ", headingPath) + "\n\n";
        return new Chunk(id, headingPath, sourceText, context + sourceText);
    }

    private static void updateHeadingPath(List<String> path, int level, String title) {
        while (path.size() >= level) path.remove(path.size() - 1);
        while (path.size() < level - 1) path.add("(không có heading cấp " + (path.size() + 1) + ")");
        path.add(title.trim());
    }

    private static List<Unit> splitUnits(String source) {
        List<String> lines = new ArrayList<>(Arrays.asList(source.split("(?<=\\n)", -1)));
        if (!lines.isEmpty() && lines.getLast().isEmpty()) lines.removeLast();
        List<Unit> result = new ArrayList<>();
        int i = 0;
        while (i < lines.size()) {
            String line = lines.get(i);
            String trimmed = line.strip();
            if (trimmed.isEmpty()) {
                int end = consumeBlank(lines, i);
                result.add(new Unit(join(lines, i, end), false, "khoảng trắng"));
                i = end;
            } else if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
                String fence = trimmed.substring(0, 3);
                int end = i + 1;
                while (end < lines.size() && !lines.get(end).strip().startsWith(fence)) end++;
                if (end < lines.size()) end++;
                end = consumeBlank(lines, end);
                result.add(new Unit(join(lines, i, end), true, "code block"));
                i = end;
            } else if (isFormulaStart(trimmed)) {
                String close = trimmed.startsWith("$$") ? "$$" : "\\]";
                int end = i + 1;
                boolean sameLineClosed = trimmed.length() > close.length() && trimmed.substring(close.length()).contains(close);
                while (!sameLineClosed && end < lines.size() && !lines.get(end).strip().endsWith(close)) end++;
                if (!sameLineClosed && end < lines.size()) end++;
                end = consumeBlank(lines, end);
                result.add(new Unit(join(lines, i, end), true, "công thức"));
                i = end;
            } else if (isTableLine(trimmed)) {
                int end = i + 1;
                while (end < lines.size() && isTableLine(lines.get(end).strip())) end++;
                end = consumeBlank(lines, end);
                result.add(new Unit(join(lines, i, end), true, "bảng"));
                i = end;
            } else if (LIST_ITEM.matcher(line).matches()) {
                int indent = leadingSpaces(line);
                int end = i + 1;
                while (end < lines.size()) {
                    String candidate = lines.get(end);
                    if (candidate.strip().isEmpty()) break;
                    Matcher nextItem = LIST_ITEM.matcher(candidate);
                    if (nextItem.matches() && leadingSpaces(candidate) <= indent) break;
                    end++;
                }
                end = consumeBlank(lines, end);
                result.add(new Unit(join(lines, i, end), true, "list item"));
                i = end;
            } else if (HEADING.matcher(line).matches()) {
                int end = consumeBlank(lines, i + 1);
                result.add(new Unit(join(lines, i, end), true, "heading"));
                i = end;
            } else {
                int end = i + 1;
                while (end < lines.size() && !lines.get(end).strip().isEmpty()
                        && !isSpecialStart(lines.get(end))) end++;
                end = consumeBlank(lines, end);
                result.add(new Unit(join(lines, i, end), false, "đoạn văn"));
                i = end;
            }
        }
        return result;
    }

    private static boolean isSpecialStart(String line) {
        String trimmed = line.strip();
        return trimmed.startsWith("```") || trimmed.startsWith("~~~") || isFormulaStart(trimmed)
                || isTableLine(trimmed) || LIST_ITEM.matcher(line).matches() || HEADING.matcher(line).matches();
    }

    private static boolean isFormulaStart(String trimmed) {
        return trimmed.startsWith("$$") || trimmed.startsWith("\\[");
    }

    private static boolean isTableLine(String trimmed) {
        return trimmed.startsWith("|") && trimmed.endsWith("|");
    }

    private static int leadingSpaces(String value) {
        int count = 0;
        while (count < value.length() && Character.isWhitespace(value.charAt(count)) && value.charAt(count) != '\n') count++;
        return count;
    }

    private static int consumeBlank(List<String> lines, int start) {
        int end = start;
        while (end < lines.size() && lines.get(end).strip().isEmpty()) end++;
        return end;
    }

    private static String join(List<String> lines, int start, int end) {
        return String.join("", lines.subList(start, end));
    }

    private static String firstLine(String value) {
        int newline = value.indexOf('\n');
        return newline < 0 ? value : value.substring(0, newline);
    }

    private record Unit(String text, boolean atomic, String kind) { }

    public record Chunk(String id, List<String> headingPath, String sourceText, String contextualText) { }
}
