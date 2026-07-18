package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JpaTextbookCatalogRepositoryTests {

    @Test
    void foldsFlatCatalogRowsIntoBookChapterLessonTree() {
        TextbookCatalog catalog = JpaTextbookCatalogRepository.toCatalog(List.of(
                row("LI10", "Vat li 10", 10, "C1", "Chapter 1", "L1", "Lesson 1", 12),
                row("LI10", "Vat li 10", 10, "C1", "Chapter 1", "L2", "Lesson 2", 18),
                row("LI10", "Vat li 10", 10, "C2", "Chapter 2", "L3", "Lesson 3", null),
                row("LI11", "Vat li 11", 11, "C3", "Chapter 3", "L4", "Lesson 4", 9)
        ));

        assertEquals("KNTT", catalog.meta().publisher());
        assertEquals(2, catalog.books().size());

        TextbookCatalog.Book firstBook = catalog.books().getFirst();
        assertEquals("LI10", firstBook.id());
        assertEquals(2, firstBook.chapters().size());
        assertEquals(2, firstBook.chapters().getFirst().lessons().size());
        assertEquals("L2", firstBook.chapters().getFirst().lessons().get(1).id());
        assertEquals(1, firstBook.chapters().get(1).lessons().size());

        TextbookCatalog.Book secondBook = catalog.books().get(1);
        assertEquals("LI11", secondBook.id());
        assertEquals("L4", secondBook.chapters().getFirst().lessons().getFirst().id());
    }

    @Test
    void keepsBooksAndChaptersWithNoChildren() {
        TextbookCatalog catalog = JpaTextbookCatalogRepository.toCatalog(List.of(
                row("EMPTY_BOOK", "Empty book", 10, null, null, null, null, null),
                row("EMPTY_CHAPTER", "Book with empty chapter", 11, "C1", "Chapter 1", null, null, null)
        ));

        assertEquals(2, catalog.books().size());
        assertEquals(0, catalog.books().getFirst().chapters().size());
        assertEquals(1, catalog.books().get(1).chapters().size());
        assertEquals(0, catalog.books().get(1).chapters().getFirst().lessons().size());
    }

    private static JpaTextbookCatalogRepository.CatalogRow row(
            String bookCode,
            String bookName,
            int grade,
            String chapterCode,
            String chapterName,
            String lessonCode,
            String lessonName,
            Integer lessonPage
    ) {
        return new JpaTextbookCatalogRepository.CatalogRow(
                bookCode,
                bookName,
                grade,
                "seed",
                "KNTT",
                "Ket noi tri thuc",
                chapterCode,
                chapterName,
                lessonCode,
                lessonName,
                lessonPage
        );
    }
}
