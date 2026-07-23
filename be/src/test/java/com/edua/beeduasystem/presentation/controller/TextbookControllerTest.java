package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.service.textbook.TextbookService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class TextbookControllerTest {
    private TextbookService service;
    private TextbookController controller;

    @BeforeEach
    void setUp() {
        service = mock(TextbookService.class);
        controller = new TextbookController(service);
    }

    @Test
    void getCatalog_delegatesAndReturnsTheFullCatalog() {
        TextbookCatalog catalog = new TextbookCatalog(new TextbookCatalog.Meta("NXB", "KNTT", "DB"), List.of());
        when(service.getCatalog()).thenReturn(catalog);

        assertThat(controller.getCatalog()).isSameAs(catalog);
        verify(service).getCatalog();
    }

    @Test
    void getBookNames_passesOptionalSubjectUnchanged() {
        List<TextbookCatalog.BookName> names = List.of(new TextbookCatalog.BookName(
                "p10", "Vật lí 10", 10, "PHYSICS", "Vật lí", 1, "NXB", "KNTT"));
        when(service.getBookNames(null)).thenReturn(names);

        assertThat(controller.getBookNames(null)).isEqualTo(names);
        verify(service).getBookNames(null);
    }

    @Test
    void getChapters_passesBookCodeAndReturnsSummaries() {
        List<TextbookCatalog.ChapterSummary> chapters = List.of(new TextbookCatalog.ChapterSummary("ch1", "Chương 1"));
        when(service.getChapters("p10")).thenReturn(chapters);

        assertThat(controller.getChapters("p10")).isEqualTo(chapters);
        verify(service).getChapters("p10");
    }

    @Test
    void getLessons_passesBookAndChapterCodesAndReturnsSummaries() {
        List<TextbookCatalog.LessonSummary> lessons = List.of(new TextbookCatalog.LessonSummary("ls1", "Bài 1", 5));
        when(service.getLessons("p10", "ch1")).thenReturn(lessons);

        assertThat(controller.getLessons("p10", "ch1")).isEqualTo(lessons);
        verify(service).getLessons("p10", "ch1");
    }
}
