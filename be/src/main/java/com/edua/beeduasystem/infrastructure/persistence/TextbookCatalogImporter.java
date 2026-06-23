package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.infrastructure.persistence.entity.ChapterEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.LessonEntity;
import com.edua.beeduasystem.infrastructure.persistence.entity.TextbookEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.TextbookJpaRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Seed catalog SGK vào DB lần đầu (idempotent): nếu bảng textbooks trống thì
 * đọc {@code physics-textbooks.json} (mục lục) + {@code lessons/{grade}.json}
 * (nội dung) từ classpath và nạp vào 3 bảng textbooks/chapters/lessons.
 */
@Component
public class TextbookCatalogImporter implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(TextbookCatalogImporter.class);

    private final TextbookJpaRepository textbookRepo;
    private final ObjectMapper objectMapper;

    public TextbookCatalogImporter(TextbookJpaRepository textbookRepo, ObjectMapper objectMapper) {
        this.textbookRepo = textbookRepo;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (textbookRepo.count() > 0) {
            return;
        }

        TextbookCatalog catalog = readCatalog();
        TextbookCatalog.Meta meta = catalog.meta();

        int books = 0;
        int chapters = 0;
        int lessons = 0;
        int withContent = 0;

        for (TextbookCatalog.Book book : catalog.books()) {
            Map<String, JsonNode> content = readContent(book.id());

            TextbookEntity textbook = new TextbookEntity();
            textbook.setId(UUID.randomUUID());
            textbook.setCode(book.id());
            textbook.setName(book.name());
            textbook.setGrade(book.grade());
            textbook.setSource(book.source());
            textbook.setPublisher(meta != null ? meta.publisher() : null);
            textbook.setSeries(meta != null ? meta.series() : null);

            int chapterOrder = 0;
            for (TextbookCatalog.Chapter chapter : book.chapters()) {
                ChapterEntity chapterEntity = new ChapterEntity();
                chapterEntity.setId(UUID.randomUUID());
                chapterEntity.setTextbook(textbook);
                chapterEntity.setCode(chapter.id());
                chapterEntity.setName(chapter.name());
                chapterEntity.setSortOrder(chapterOrder++);

                int lessonOrder = 0;
                for (TextbookCatalog.Lesson lesson : chapter.lessons()) {
                    LessonEntity lessonEntity = new LessonEntity();
                    lessonEntity.setId(UUID.randomUUID());
                    lessonEntity.setChapter(chapterEntity);
                    lessonEntity.setCode(lesson.id());
                    lessonEntity.setName(lesson.name());
                    lessonEntity.setPage(lesson.page());
                    lessonEntity.setSortOrder(lessonOrder++);

                    JsonNode node = content.get(lesson.id());
                    if (node != null) {
                        lessonEntity.setKnowledgeJson(node.toString());
                        withContent++;
                    }

                    chapterEntity.getLessons().add(lessonEntity);
                    lessons++;
                }

                textbook.getChapters().add(chapterEntity);
                chapters++;
            }

            textbookRepo.save(textbook);
            books++;
        }

        log.info("Seeded textbook catalog: {} books, {} chapters, {} lessons ({} with content)",
                books, chapters, lessons, withContent);
    }

    private TextbookCatalog readCatalog() throws Exception {
        try (InputStream is = new ClassPathResource("physics-textbooks.json").getInputStream()) {
            return objectMapper.readValue(is, TextbookCatalog.class);
        }
    }

    private Map<String, JsonNode> readContent(String grade) {
        String resource = "lessons/" + grade + ".json";
        ClassPathResource cp = new ClassPathResource(resource);
        if (!cp.exists()) {
            return Map.of();
        }
        try (InputStream is = cp.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            Map<String, JsonNode> byCode = new HashMap<>();
            root.fields().forEachRemaining(e -> byCode.put(e.getKey(), e.getValue()));
            return byCode;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to read " + resource, e);
        }
    }
}
