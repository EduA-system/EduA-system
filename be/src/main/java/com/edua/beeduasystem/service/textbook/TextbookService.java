package com.edua.beeduasystem.service.textbook;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Cung cấp catalog SGK từ DB cho tầng presentation.
 */
@Service
public class TextbookService {

    private final TextbookCatalogRepository catalogRepository;

    public TextbookService(TextbookCatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    public TextbookCatalog getCatalog() {
        return catalogRepository.loadCatalog();
    }

    public List<TextbookCatalog.BookName> getBookNames(String subjectCode) {
        return catalogRepository.listBookNames(subjectCode);
    }

    public List<TextbookCatalog.ChapterSummary> getChapters(String bookCode) {
        return catalogRepository.listChapters(bookCode);
    }

    public List<TextbookCatalog.LessonSummary> getLessons(String bookCode, String chapterCode) {
        return catalogRepository.listLessons(bookCode, chapterCode);
    }
}
