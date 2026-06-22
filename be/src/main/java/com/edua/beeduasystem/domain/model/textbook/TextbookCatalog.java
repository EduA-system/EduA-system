package com.edua.beeduasystem.domain.model.textbook;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Catalog SGK (Kết nối tri thức) dạng cây {@code book → chapter → lesson}.
 *
 * <p>Dữ liệu read-only nạp từ JSON trên classpath ({@code physics-textbooks.json}),
 * FE tự lọc dropdown Subject/Grade/Chapter/Lesson từ cây này (BR-07).
 */
public record TextbookCatalog(
        @JsonProperty("_meta") Meta meta,
        List<Book> books
) {
    public record Meta(String publisher, String series, String source) {
    }

    public record Book(String id, String name, int grade, String source, List<Chapter> chapters) {
    }

    public record Chapter(String id, String name, List<Lesson> lessons) {
    }

    public record Lesson(String id, String name, Integer page) {
    }
}
