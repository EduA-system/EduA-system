package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.infrastructure.persistence.repository.LessonJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.TextbookJpaRepository;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class JpaTextbookCatalogRepository implements TextbookCatalogRepository {

    private static final String BOOK_NAMES_SQL = """
            SELECT code, name, grade, subject_code, subject_name, volume, publisher, series
            FROM textbook_names
            ORDER BY sort_order ASC, grade ASC, volume ASC NULLS FIRST, code ASC
            """;

    private static final String BOOK_NAMES_BY_SUBJECT_SQL = """
            SELECT code, name, grade, subject_code, subject_name, volume, publisher, series
            FROM textbook_names
            WHERE subject_code = ?
            ORDER BY sort_order ASC, grade ASC, volume ASC NULLS FIRST, code ASC
            """;

    private static final String CHAPTERS_SQL = """
            SELECT c.code, c.name
            FROM chapters c
            JOIN textbooks t ON t.id = c.textbook_id
            WHERE t.code = ?
              AND EXISTS (
                  SELECT 1
                  FROM lessons l
                  WHERE l.chapter_id = c.id
              )
            ORDER BY c.sort_order ASC, c.code ASC
            """;

    private static final String LESSONS_SQL = """
            SELECT l.code, l.name, l.page
            FROM lessons l
            JOIN chapters c ON c.id = l.chapter_id
            JOIN textbooks t ON t.id = c.textbook_id
            WHERE t.code = ? AND c.code = ?
            ORDER BY l.sort_order ASC, l.code ASC
            """;

    private static final String CATALOG_SQL = """
            SELECT
                t.code AS book_code,
                t.name AS book_name,
                t.grade AS book_grade,
                t.source AS book_source,
                t.publisher AS publisher,
                t.series AS series,
                c.code AS chapter_code,
                c.name AS chapter_name,
                l.code AS lesson_code,
                l.name AS lesson_name,
                l.page AS lesson_page
            FROM textbooks t
            LEFT JOIN chapters c ON c.textbook_id = t.id
            LEFT JOIN lessons l ON l.chapter_id = c.id
            ORDER BY t.grade ASC, t.code ASC, c.sort_order ASC, c.code ASC, l.sort_order ASC, l.code ASC
            """;

    private final TextbookJpaRepository textbookRepo;
    private final LessonJpaRepository lessonRepo;
    private final JdbcTemplate jdbcTemplate;

    public JpaTextbookCatalogRepository(TextbookJpaRepository textbookRepo,
                                        LessonJpaRepository lessonRepo,
                                        JdbcTemplate jdbcTemplate) {
        this.textbookRepo = textbookRepo;
        this.lessonRepo = lessonRepo;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public TextbookCatalog loadCatalog() {
        List<CatalogRow> rows = jdbcTemplate.query(CATALOG_SQL, (rs, rowNum) -> new CatalogRow(
                rs.getString("book_code"),
                rs.getString("book_name"),
                rs.getInt("book_grade"),
                rs.getString("book_source"),
                rs.getString("publisher"),
                rs.getString("series"),
                rs.getString("chapter_code"),
                rs.getString("chapter_name"),
                rs.getString("lesson_code"),
                rs.getString("lesson_name"),
                (Integer) rs.getObject("lesson_page")
        ));
        return toCatalog(rows);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TextbookCatalog.BookName> listBookNames(String subjectCode) {
        String normalizedSubjectCode = normalizeSubjectCode(subjectCode);
        if (normalizedSubjectCode == null) {
            return jdbcTemplate.query(BOOK_NAMES_SQL, this::toBookName);
        }
        return jdbcTemplate.query(BOOK_NAMES_BY_SUBJECT_SQL, this::toBookName, normalizedSubjectCode);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TextbookCatalog.ChapterSummary> listChapters(String bookCode) {
        return jdbcTemplate.query(
                CHAPTERS_SQL,
                (rs, rowNum) -> new TextbookCatalog.ChapterSummary(
                        rs.getString("code"),
                        rs.getString("name")
                ),
                bookCode
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<TextbookCatalog.LessonSummary> listLessons(String bookCode, String chapterCode) {
        return jdbcTemplate.query(
                LESSONS_SQL,
                (rs, rowNum) -> new TextbookCatalog.LessonSummary(
                        rs.getString("code"),
                        rs.getString("name"),
                        (Integer) rs.getObject("page")
                ),
                bookCode,
                chapterCode
        );
    }

    @Override
    public boolean isEmpty() {
        return textbookRepo.count() == 0;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<String> findLessonKnowledge(String bookCode, String chapterCode, String lessonCode) {
        return lessonRepo.findKnowledge(bookCode, chapterCode, lessonCode);
    }

    private String normalizeSubjectCode(String subjectCode) {
        if (subjectCode == null || subjectCode.isBlank()) {
            return null;
        }
        return subjectCode.trim().toUpperCase();
    }

    private TextbookCatalog.BookName toBookName(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new TextbookCatalog.BookName(
                rs.getString("code"),
                rs.getString("name"),
                rs.getInt("grade"),
                rs.getString("subject_code"),
                rs.getString("subject_name"),
                (Integer) rs.getObject("volume"),
                rs.getString("publisher"),
                rs.getString("series")
        );
    }

    static TextbookCatalog toCatalog(List<CatalogRow> rows) {
        if (rows.isEmpty()) {
            return new TextbookCatalog(new TextbookCatalog.Meta(null, null, null), List.of());
        }

        Map<String, BookBuilder> books = new LinkedHashMap<>();
        for (CatalogRow row : rows) {
            BookBuilder book = books.computeIfAbsent(
                    row.bookCode(),
                    ignored -> new BookBuilder(
                            row.bookCode(),
                            row.bookName(),
                            row.bookGrade(),
                            row.bookSource(),
                            row.publisher(),
                            row.series()
                    )
            );

            if (row.chapterCode() == null) {
                continue;
            }

            ChapterBuilder chapter = book.chapters.computeIfAbsent(
                    row.chapterCode(),
                    ignored -> new ChapterBuilder(row.chapterCode(), row.chapterName())
            );

            if (row.lessonCode() != null) {
                chapter.lessons.add(new TextbookCatalog.Lesson(
                        row.lessonCode(),
                        row.lessonName(),
                        row.lessonPage()
                ));
            }
        }

        List<TextbookCatalog.Book> catalogBooks = books.values().stream()
                .map(BookBuilder::toBook)
                .toList();
        BookBuilder first = books.values().iterator().next();
        TextbookCatalog.Meta meta = new TextbookCatalog.Meta(
                first.publisher,
                first.series,
                "Seeded from physics-textbooks.json + lessons/*.json"
        );
        return new TextbookCatalog(meta, catalogBooks);
    }

    record CatalogRow(
            String bookCode,
            String bookName,
            int bookGrade,
            String bookSource,
            String publisher,
            String series,
            String chapterCode,
            String chapterName,
            String lessonCode,
            String lessonName,
            Integer lessonPage
    ) {
    }

    private static final class BookBuilder {
        private final String code;
        private final String name;
        private final int grade;
        private final String source;
        private final String publisher;
        private final String series;
        private final Map<String, ChapterBuilder> chapters = new LinkedHashMap<>();

        private BookBuilder(String code, String name, int grade, String source, String publisher, String series) {
            this.code = code;
            this.name = name;
            this.grade = grade;
            this.source = source;
            this.publisher = publisher;
            this.series = series;
        }

        private TextbookCatalog.Book toBook() {
            return new TextbookCatalog.Book(
                    code,
                    name,
                    grade,
                    source,
                    chapters.values().stream()
                            .map(ChapterBuilder::toChapter)
                            .toList()
            );
        }
    }

    private static final class ChapterBuilder {
        private final String code;
        private final String name;
        private final List<TextbookCatalog.Lesson> lessons = new ArrayList<>();

        private ChapterBuilder(String code, String name) {
            this.code = code;
            this.name = name;
        }

        private TextbookCatalog.Chapter toChapter() {
            return new TextbookCatalog.Chapter(code, name, List.copyOf(lessons));
        }
    }
}
