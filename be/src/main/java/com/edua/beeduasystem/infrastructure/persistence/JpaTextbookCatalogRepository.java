package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.infrastructure.persistence.entity.TextbookEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.LessonJpaRepository;
import com.edua.beeduasystem.infrastructure.persistence.repository.TextbookJpaRepository;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public class JpaTextbookCatalogRepository implements TextbookCatalogRepository {

    private final TextbookJpaRepository textbookRepo;
    private final LessonJpaRepository lessonRepo;

    public JpaTextbookCatalogRepository(TextbookJpaRepository textbookRepo, LessonJpaRepository lessonRepo) {
        this.textbookRepo = textbookRepo;
        this.lessonRepo = lessonRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public TextbookCatalog loadCatalog() {
        List<TextbookEntity> textbooks = textbookRepo.findAllByOrderByGradeAsc();

        List<TextbookCatalog.Book> books = textbooks.stream()
                .map(this::toBook)
                .toList();

        TextbookCatalog.Meta meta = textbooks.isEmpty()
                ? new TextbookCatalog.Meta(null, null, null)
                : new TextbookCatalog.Meta(
                        textbooks.get(0).getPublisher(),
                        textbooks.get(0).getSeries(),
                        "Seeded from physics-textbooks.json + lessons/*.json");

        return new TextbookCatalog(meta, books);
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

    private TextbookCatalog.Book toBook(TextbookEntity t) {
        List<TextbookCatalog.Chapter> chapters = t.getChapters().stream()
                .map(c -> new TextbookCatalog.Chapter(
                        c.getCode(),
                        c.getName(),
                        c.getLessons().stream()
                                .map(l -> new TextbookCatalog.Lesson(l.getCode(), l.getName(), l.getPage()))
                                .toList()))
                .toList();
        return new TextbookCatalog.Book(t.getCode(), t.getName(), t.getGrade(), t.getSource(), chapters);
    }
}
