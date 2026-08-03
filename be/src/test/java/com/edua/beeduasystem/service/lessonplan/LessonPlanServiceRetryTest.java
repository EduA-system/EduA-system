package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kiểm chứng auto-retry (re-roll) của {@link LessonPlanService}: mỗi phần sinh giáo án tự thử lại
 * khi call AI lỗi transient HOẶC AI trả JSON sai schema; nhưng KHÔNG thử lại lỗi input.
 */
@ExtendWith(MockitoExtension.class)
class LessonPlanServiceRetryTest {

    private static final String VALID_OBJECTIVES_JSON = """
            {"knowledge":["k1"],"competencies":{"general":["g1"],"specific":["s1"]},"qualities":["q1"]}
            """;

    @Mock private TextbookCatalogRepository catalogRepository;
    @Mock private AiClient aiClient;
    @Mock private AiSystemPromptService systemPromptService;

    /** Service với maxAttempts=3, backoff=0 (khỏi chờ trong test). */
    private LessonPlanService service() {
        return new LessonPlanService(
                catalogRepository, aiClient, new LessonPlan5512PromptBuilder(), new LessonPlanEditPromptBuilder(), new ObjectMapper(),
                Executors.newVirtualThreadPerTaskExecutor(), systemPromptService, 3, 0L);
    }

    private void stubKnowledgeAndPrompt() {
        when(catalogRepository.findLessonKnowledge(anyString(), anyString(), anyString()))
                .thenReturn(Optional.of("{\"noiDung\":\"x\"}"));
        // apply(key, prompt) trả nguyên prompt để aiClient nhận đúng chuỗi.
        when(systemPromptService.apply(any(AiPromptKey.class), anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    private GenerateLessonPlanRequest request() {
        return new GenerateLessonPlanRequest("HOA_10", "CH_1", "BAI_1", null);
    }

    @Test
    void retriesOnTransientAiFailureThenSucceeds() {
        stubKnowledgeAndPrompt();
        when(aiClient.generate(anyString()))
                .thenThrow(new RuntimeException("429 rate limit"))
                .thenThrow(new RuntimeException("503 upstream"))
                .thenReturn(VALID_OBJECTIVES_JSON);

        LessonPlan5512 result = service().generateObjectives(request());

        assertEquals("k1", result.objectives().knowledge().getFirst());
        verify(aiClient, times(3)).generate(anyString());
    }

    @Test
    void retriesOnParseFailureThenSucceeds() {
        stubKnowledgeAndPrompt();
        when(aiClient.generate(anyString()))
                .thenReturn("khong-phai-json")
                .thenReturn(VALID_OBJECTIVES_JSON);

        LessonPlan5512 result = service().generateObjectives(request());

        assertEquals("q1", result.objectives().qualities().getFirst());
        verify(aiClient, times(2)).generate(anyString());
    }

    @Test
    void throwsAfterExhaustingAttempts() {
        stubKnowledgeAndPrompt();
        when(aiClient.generate(anyString())).thenThrow(new RuntimeException("luôn lỗi"));

        assertThrows(LessonPlanGenerationException.class, () -> service().generateObjectives(request()));
        verify(aiClient, times(3)).generate(anyString());
    }

    @Test
    void doesNotRetryOnInvalidInput() {
        // ids trống → loadKnowledge ném IllegalArgumentException TRƯỚC khi gọi AI.
        GenerateLessonPlanRequest bad = new GenerateLessonPlanRequest("", "", "", null);

        assertThrows(IllegalArgumentException.class, () -> service().generateObjectives(bad));
        verify(aiClient, never()).generate(anyString());
    }
}
