package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;

import java.util.List;
import java.util.Optional;

/**
 * Truy cập catalog SGK trong DB. Service phụ thuộc interface này;
 * implementation JPA ở {@code infrastructure/persistence}.
 */
public interface TextbookCatalogRepository {

    /** Cây catalog đầy đủ (book → chapter → lesson), tiêu đề-only, đã sắp xếp. */
    TextbookCatalog loadCatalog();

    List<TextbookCatalog.BookName> listBookNames(String subjectCode);

    List<TextbookCatalog.ChapterSummary> listChapters(String bookCode);

    List<TextbookCatalog.LessonSummary> listLessons(String bookCode, String chapterCode);

    /** Chưa có textbook nào — dùng để importer quyết định seed hay bỏ qua. */
    boolean isEmpty();

    /** Nội dung SGK số hóa của một bài (cho {@code /generate}); rỗng nếu thiếu. */
    Optional<String> findLessonKnowledge(String bookCode, String chapterCode, String lessonCode);
}
