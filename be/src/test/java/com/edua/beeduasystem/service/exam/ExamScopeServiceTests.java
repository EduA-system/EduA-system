package com.edua.beeduasystem.service.exam;

import com.edua.beeduasystem.domain.model.exam.ExamLessonSource;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExamScopeServiceTests {
    @Test
    void splitsSingleBookBySemesterThenMidterm() {
        TextbookCatalogRepository repository = mock(TextbookCatalogRepository.class);
        when(repository.findExamLessonSources("PHYSICS", 11)).thenReturn(sources(null, 9));
        ExamScopeService service = new ExamScopeService(repository);

        assertThat(service.preview("PHYSICS", 11, "GIUA_HK1").lessons()).hasSize(3);
        assertThat(service.preview("PHYSICS", 11, "CUOI_HK1").lessons()).hasSize(5);
        assertThat(service.preview("PHYSICS", 11, "GIUA_HK2").lessons()).hasSize(2);
        assertThat(service.preview("PHYSICS", 11, "CUOI_HK2").lessons()).hasSize(4);
    }

    @Test
    void usesBookVolumeAsSemesterBoundary() {
        TextbookCatalogRepository repository = mock(TextbookCatalogRepository.class);
        List<ExamLessonSource> values = new ArrayList<>();
        values.addAll(sources(1, 6));
        values.addAll(sources(2, 8));
        when(repository.findExamLessonSources("MATH", 10)).thenReturn(values);
        ExamScopeService service = new ExamScopeService(repository);

        assertThat(service.preview("MATH", 10, "GIUA_HK2").lessons()).hasSize(4);
        assertThat(service.preview("MATH", 10, "CUOI_HK2").lessons()).hasSize(8);
    }

    private List<ExamLessonSource> sources(Integer volume, int count) {
        List<ExamLessonSource> values = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            values.add(new ExamLessonSource("PHYSICS", 11, "B" + (volume == null ? "" : volume), "Book", volume,
                    volume == null ? 0 : volume, "C" + (i / 3), "Chapter " + (i / 3), i / 3,
                    "L" + volume + "-" + i, "Lesson " + i, i, "{}"));
        }
        return values;
    }
}
