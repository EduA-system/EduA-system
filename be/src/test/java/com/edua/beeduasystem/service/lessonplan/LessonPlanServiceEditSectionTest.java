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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
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

    /** Áp dụng cho cả 2 key (LESSON_PLAN_EDIT_SECTION_SELECT lẫn LESSON_PLAN_EDIT_SECTION) — trả
     * nguyên văn prompt đã build, không có tuỳ biến IT Staff trong test. */
    private void stubPromptApply() {
        when(systemPromptService.apply(any(AiPromptKey.class), anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    /** Định tuyến response AI theo NỘI DUNG prompt thay vì theo thứ tự gọi — bắt buộc vì các call
     * viết (bước 2) chạy SONG SONG nên thứ tự gọi thật sự không xác định được trước.
     * `selectResponse` được trả cho call bước 1 (nhận diện qua marker liệt kê danh sách phần);
     * `writeResponsesById` ánh xạ id -> response JSON cho call bước 2 (nhận diện qua dòng
     * "id: <id>" duy nhất có trong prompt viết của đúng target đó). */
    private void stubAiResponses(String selectResponse, java.util.Map<String, String> writeResponsesById) {
        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String prompt = invocation.getArgument(0);
            if (prompt.contains("===DANH SÁCH PHẦN GIÁO ÁN")) {
                return selectResponse;
            }
            for (var entry : writeResponsesById.entrySet()) {
                if (prompt.contains("id: " + entry.getKey())) {
                    return entry.getValue();
                }
            }
            throw new IllegalStateException("Prompt viết không khớp id nào đã stub:\n" + prompt);
        });
    }

    // ---- Luồng thành công --------------------------------------------------------------

    @Test
    void editSectionSelectsAndWritesSingleSection() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\"]}",
                java.util.Map.of("sec-1", "{\"content\":\"**1. Kiến thức**\\n- Nêu được ý chính.\"}"));

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(1, response.size());
        assertEquals("sec-1", response.get(0).targetId());
        assertEquals("**1. Kiến thức**\n- Nêu được ý chính.", response.get(0).content());
    }

    @Test
    void editSectionSelectsAndWritesMultipleSectionsInParallel() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\",\"sec-2\"]}",
                java.util.Map.of(
                        "sec-1", "{\"content\":\"A\"}",
                        "sec-2", "{\"content\":\"B\"}"));

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(2, response.size());
        assertEquals("sec-1", response.get(0).targetId());
        assertEquals("A", response.get(0).content());
        assertEquals("sec-2", response.get(1).targetId());
        assertEquals("B", response.get(1).content());
    }

    // ---- Bước chọn (select) trả dữ liệu không hợp lệ ------------------------------------

    @Test
    void editSectionRejectsUnknownTargetIdFromSelectStep() {
        stubPromptApply();
        stubAiResponses("{\"targetIds\":[\"sec-x\"]}", java.util.Map.of());

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
        // Chọn thất bại phải chặn TRƯỚC khi có bất kỳ call viết nào — chỉ đúng 1 call (bước chọn).
        verify(aiClient, times(1)).generate(anyString());
    }

    @Test
    void editSectionRejectsDuplicateTargetIdFromSelectStep() {
        stubPromptApply();
        stubAiResponses("{\"targetIds\":[\"sec-1\",\"sec-1\"]}", java.util.Map.of());

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsEmptyTargetIdsList() {
        stubPromptApply();
        stubAiResponses("{\"targetIds\":[]}", java.util.Map.of());

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionRejectsMalformedSelectJson() {
        stubPromptApply();
        stubAiResponses("khong phai json", java.util.Map.of());

        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    // ---- Bước viết (write) lỗi từng phần -------------------------------------------------

    @Test
    void editSectionRejectsMalformedWriteJson() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\"]}",
                java.util.Map.of("sec-1", "khong phai json"));

        // Chỉ có 1 target và target đó lỗi -> toàn bộ request thất bại (giống hành vi cũ).
        assertThrows(LessonPlanGenerationException.class, () -> service().editSection(request()));
    }

    @Test
    void editSectionTreatsBlankWriteContentAsFailureForThatTargetOnly() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\",\"sec-2\"]}",
                java.util.Map.of(
                        "sec-1", "{\"content\":\"\"}",
                        "sec-2", "{\"content\":\"B\"}"));

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(1, response.size());
        assertEquals("sec-2", response.get(0).targetId());
        assertEquals("B", response.get(0).content());
    }

    @Test
    void editSectionTeratesPartialWriteFailureAndReturnsSurvivingResult() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\",\"sec-2\"]}",
                java.util.Map.of(
                        "sec-1", "not json",
                        "sec-2", "{\"content\":\"B\"}"));

        List<EditLessonSectionResponse> response = service().editSection(request());

        assertEquals(1, response.size());
        assertEquals("sec-2", response.get(0).targetId());
    }

    @Test
    void editSectionThrowsWhenAllWritesFail() {
        stubPromptApply();
        stubAiResponses(
                "{\"targetIds\":[\"sec-1\",\"sec-2\"]}",
                java.util.Map.of(
                        "sec-1", "not json",
                        "sec-2", "{\"content\":\"\"}"));

        LessonPlanGenerationException ex = assertThrows(LessonPlanGenerationException.class,
                () -> service().editSection(request()));
        assertTrue(ex.getMessage().contains("Không viết lại được phần giáo án nào"));
    }
}
