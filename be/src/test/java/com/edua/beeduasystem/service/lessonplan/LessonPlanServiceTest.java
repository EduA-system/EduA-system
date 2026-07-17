package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class LessonPlanServiceTest {
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    @AfterEach void closeExecutor() { executor.shutdownNow(); }

    @Test
    void generateObjectives_loadsKnowledgeParsesFencedJsonAndCallsAi() {
        TextbookCatalogRepository catalog = mock(TextbookCatalogRepository.class);
        AiClient ai = mock(AiClient.class);
        when(catalog.findLessonKnowledge("book", "chapter", "lesson")).thenReturn(Optional.of("knowledge"));
        when(ai.generate(anyString())).thenReturn("```json\n{\"knowledge\":[\"K\"],\"competencies\":{\"general\":[],\"specific\":[]},\"qualities\":[]}\n```");
        LessonPlanService service = service(catalog, ai);

        assertThat(service.generateObjectives(new GenerateLessonPlanRequest("book", "chapter", "lesson", null))
                .objectives().knowledge()).containsExactly("K");
        verify(ai).generate(anyString());
    }

    @Test
    void generation_rejectsMissingKnowledgeAndWrapsAiOrJsonFailures() {
        TextbookCatalogRepository catalog = mock(TextbookCatalogRepository.class);
        AiClient ai = mock(AiClient.class);
        LessonPlanService service = service(catalog, ai);
        assertThatThrownBy(() -> service.generateMaterials(new GenerateLessonPlanRequest(" ", "c", "l", null)))
                .isInstanceOf(IllegalArgumentException.class);
        when(catalog.findLessonKnowledge("b", "c", "l")).thenReturn(Optional.of("k"));
        when(ai.generate(anyString())).thenReturn("not-json");
        assertThatThrownBy(() -> service.generateMaterials(new GenerateLessonPlanRequest("b", "c", "l", null)))
                .isInstanceOf(LessonPlanGenerationException.class);
    }

    private LessonPlanService service(TextbookCatalogRepository catalog, AiClient ai) {
        return new LessonPlanService(catalog, ai, new LessonPlan5512PromptBuilder(), new ObjectMapper(), executor);
    }
}
