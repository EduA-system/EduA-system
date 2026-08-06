package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest.SectionInput;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionResponse;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.concurrent.Executors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LessonPlanServiceEditSectionTest {

    @Mock private TextbookCatalogRepository catalogRepository;
    @Mock private AiClient aiClient;
    @Mock private AiSystemPromptService systemPromptService;

    private LessonPlanService service() {
        return new LessonPlanService(
                catalogRepository, aiClient, new LessonPlan5512PromptBuilder(), new LessonPlanEditPromptBuilder(),
                new ObjectMapper(), Executors.newVirtualThreadPerTaskExecutor(), systemPromptService, 1, 0L);
    }

    private EditLessonSectionRequest request() {
        return new EditLessonSectionRequest(
                "làm ngắn gọn phần Mục tiêu",
                List.of(
                        new SectionInput("sec-1", "I. MỤC TIÊU", "I. MỤC TIÊU\nNội dung dài", "text"),
                        new SectionInput("sec-2", "Hoạt động 1: Khởi động", "Hoạt động 1\nNhiệm vụ", "text")
                )
        );
    }

    private void stubPromptApply() {
        when(systemPromptService.apply(eq(AiPromptKey.LESSON_PLAN_EDIT_SECTION), anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    @Test
    void editSectionReturnsValidAiProposal() {
        stubPromptApply();
        when(aiClient.generate(anyString()))
                .thenReturn("{\"edits\":[{\"targetId\":\"sec-1\",\"content\":\"**1. Kiến thức**\\n- Nêu được ý chính.\"}]}");

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(1, response.size());
        assertEquals("sec-1", response.get(0).targetId());
        assertEquals("**1. Kiến thức**\n- Nêu được ý chính.", response.get(0).content());
    }

    @Test
    void editSectionReturnsMultipleValidProposals() {
        stubPromptApply();
        when(aiClient.generate(anyString()))
                .thenReturn("{\"edits\":[{\"targetId\":\"sec-1\",\"content\":\"A\"},{\"targetId\":\"sec-2\",\"content\":\"B\"}]}");

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(2, response.size());
        assertEquals("sec-1", response.get(0).targetId());
        assertEquals("A", response.get(0).content());
        assertEquals("sec-2", response.get(1).targetId());
        assertEquals("B", response.get(1).content());
    }

    @Test
    void editSectionRejectsUnknownTargetId() {
        stubPromptApply();
        when(aiClient.generate(anyString()))
                .thenReturn("{\"edits\":[{\"targetId\":\"sec-x\",\"content\":\"Nội dung\"}]}");

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsDuplicateTargetId() {
        stubPromptApply();
        when(aiClient.generate(anyString()))
                .thenReturn("{\"edits\":[{\"targetId\":\"sec-1\",\"content\":\"A\"},{\"targetId\":\"sec-1\",\"content\":\"B\"}]}");

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsEmptyEditsList() {
        stubPromptApply();
        when(aiClient.generate(anyString())).thenReturn("{\"edits\":[]}");

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsBlankContentInAnyEdit() {
        stubPromptApply();
        when(aiClient.generate(anyString()))
                .thenReturn("{\"edits\":[{\"targetId\":\"sec-1\",\"content\":\"\"}]}");

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsMalformedJson() {
        stubPromptApply();
        when(aiClient.generate(anyString())).thenReturn("khong phai json");

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }
}
