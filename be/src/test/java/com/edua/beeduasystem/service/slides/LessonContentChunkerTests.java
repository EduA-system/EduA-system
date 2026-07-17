package com.edua.beeduasystem.service.slides;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LessonContentChunkerTests {

    @Test
    void preservesOrderAndEverySourceCharacterWhileCarryingHeadingContext() {
        String source = "# Bài học\n\n## Mục một\n\n" + "Câu ngắn. ".repeat(30)
                + "\n\n## Mục hai\n\n" + "Nội dung tiếp. ".repeat(30);
        LessonContentChunker chunker = new LessonContentChunker(180, 240);

        List<LessonContentChunker.Chunk> chunks = chunker.chunk(source);

        assertTrue(chunks.size() > 2);
        assertEquals(source, chunks.stream().map(LessonContentChunker.Chunk::sourceText).reduce("", String::concat));
        assertEquals(List.of("Bài học", "Mục một"), chunks.get(1).headingPath());
        assertTrue(chunks.get(1).contextualText().startsWith("ĐƯỜNG DẪN HEADING: Bài học > Mục một"));
        for (int i = 0; i < chunks.size(); i++) assertEquals("c" + (i + 1), chunks.get(i).id());
    }

    @Test
    void keepsListItemsTablesCodeAndFormulaBlocksAtomic() {
        String list = "- " + "một mục ".repeat(15) + "\n";
        String table = "| A | B |\n|---|---|\n| 1 | 2 |\n\n";
        String code = "```java\nSystem.out.println(1);\n```\n\n";
        String formula = "$$\nF = ma\n$$\n\n";
        String source = "# Hóa học\n\n" + list + table + code + formula;

        List<LessonContentChunker.Chunk> chunks = new LessonContentChunker(80, 180).chunk(source);

        assertEquals(source, chunks.stream().map(LessonContentChunker.Chunk::sourceText).reduce("", String::concat));
        assertTrue(chunks.stream().anyMatch(chunk -> chunk.sourceText().contains(list)));
        assertTrue(chunks.stream().anyMatch(chunk -> chunk.sourceText().contains(table)));
        assertTrue(chunks.stream().anyMatch(chunk -> chunk.sourceText().contains(code)));
        assertTrue(chunks.stream().anyMatch(chunk -> chunk.sourceText().contains(formula)));
    }

    @Test
    void splitsOversizedParagraphOnlyAtSentenceBoundaries() {
        String source = "# Mục\n\n" + "Đây là một câu đủ dài. ".repeat(20);
        List<LessonContentChunker.Chunk> chunks = new LessonContentChunker(100, 120).chunk(source);

        assertEquals(source, chunks.stream().map(LessonContentChunker.Chunk::sourceText).reduce("", String::concat));
        assertTrue(chunks.stream().allMatch(chunk -> chunk.sourceText().length() <= 120));
    }

    @Test
    void rejectsOversizedAtomicBlockWithHeading() {
        String source = "# Thí nghiệm\n\n| Cột |\n| " + "dữ liệu".repeat(30) + " |\n";

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> new LessonContentChunker(80, 120).chunk(source));

        assertTrue(error.getMessage().contains("bảng"));
        assertTrue(error.getMessage().contains("Thí nghiệm"));
    }

    @Test
    void rejectsSingleSentenceThatCannotFit() {
        String source = "# Lý thuyết\n\n" + "không có dấu kết câu ".repeat(20);
        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> new LessonContentChunker(80, 120).chunk(source));
        assertTrue(error.getMessage().contains("không có ranh giới câu"));
    }
}
