package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest.SectionInput;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LessonPlanEditPromptBuilderTest {

    private final LessonPlanEditPromptBuilder builder = new LessonPlanEditPromptBuilder();

    // ---- buildSelectPrompt (bước 1 — chọn mục) --------------------------------------------

    @Test
    void selectPromptOmitsSectionContent() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "soạn lại hoạt động 3",
                List.of(new SectionInput("sec-1", "I. MỤC TIÊU", "NOI_DUNG_BI_MAT_KHONG_DUOC_LO", "text"))));

        assertFalse(prompt.contains("NOI_DUNG_BI_MAT_KHONG_DUOC_LO"), "không được gửi content ở bước chọn");
        assertFalse(prompt.contains("content:"), "không được có nhãn content: ở bước chọn");
    }

    @Test
    void selectPromptIncludesIdHeadingKindForEverySection() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "sửa",
                List.of(
                        new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung 1", "text"),
                        new SectionInput("sec-5", "Hoạt động 3: Luyện tập (20 phút)", "Nội dung 2", "text"))));

        assertTrue(prompt.contains("id: sec-1"));
        assertTrue(prompt.contains("heading: I. MỤC TIÊU"));
        assertTrue(prompt.contains("id: sec-5"));
        assertTrue(prompt.contains("heading: Hoạt động 3: Luyện tập (20 phút)"));
        assertTrue(prompt.contains("kind: text"));
    }

    @Test
    void selectPromptDefaultsMissingKindToText() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "sửa",
                List.of(new SectionInput("sec-3", "I. MỤC TIÊU", "Nội dung", null))));

        assertTrue(prompt.contains("kind: text"));
        assertFalse(prompt.contains("kind: null"));
    }

    @Test
    void selectPromptOutputContractRequestsTargetIdsArray() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "sửa",
                List.of(new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung", "text"))));

        assertTrue(prompt.contains("\"targetIds\""), "schema đầu ra bước chọn phải là mảng targetIds");
    }

    // ---- buildWritePrompt (bước 2 — viết lại một mục đã chọn) -----------------------------

    @Test
    void writePromptOmitsTableAndKindRulesForTextKind() {
        String prompt = builder.buildWritePrompt("làm ngắn gọn",
                new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung", "text"));

        assertFalse(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"), "kind text không cần quy ước bảng");
        assertFalse(prompt.contains("kind \"materials\""));
        assertFalse(prompt.contains("kind \"subActivity\""));
    }

    @Test
    void writePromptIncludesTableAndMaterialsRulesForMaterialsKind() {
        String prompt = builder.buildWritePrompt("thêm thiết bị",
                new SectionInput("sec-2", "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "‖ A ‖ B ‖\n| 1 | 2 |", "materials"));

        assertTrue(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"));
        assertTrue(prompt.contains("kind \"materials\""));
        assertFalse(prompt.contains("kind \"subActivity\""), "không cần nhồi quy tắc subActivity cho mục materials");
    }

    @Test
    void writePromptIncludesTableAndSubActivityRulesForSubActivityKind() {
        String prompt = builder.buildWritePrompt("sửa tiểu hoạt động",
                new SectionInput("sec-4", "2.1 Tìm hiểu khái niệm", "‖ A ‖ B ‖\n| 1 | 2 |", "subActivity"));

        assertTrue(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"));
        assertTrue(prompt.contains("kind \"subActivity\""));
        assertFalse(prompt.contains("kind \"materials\""), "không cần nhồi quy tắc materials cho mục subActivity");
    }

    @Test
    void writePromptThreadsSingleSectionContentAndKind() {
        String prompt = builder.buildWritePrompt("thêm thiết bị",
                new SectionInput("sec-2", "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "‖ A ‖ B ‖\n| 1 | 2 |", "materials"));

        assertTrue(prompt.contains("kind: materials"));
        assertTrue(prompt.contains("‖ A ‖ B ‖"));
    }

    @Test
    void writePromptDefaultsMissingKindToText() {
        String prompt = builder.buildWritePrompt("sửa",
                new SectionInput("sec-3", "I. MỤC TIÊU", "Nội dung", null));

        assertTrue(prompt.contains("kind: text"));
        assertFalse(prompt.contains("kind: null"));
        assertFalse(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"));
    }

    @Test
    void writePromptOutputContractRequestsContentField() {
        String prompt = builder.buildWritePrompt("sửa",
                new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung", "text"));

        assertTrue(prompt.contains("\"content\""), "schema đầu ra bước viết phải có field content");
        assertFalse(prompt.contains("\"edits\""));
        assertFalse(prompt.contains("\"targetIds\""));
    }

    // ---- buildWritePrompt kind "activity" (Hoạt động cấp 1 — HĐ1/3/4) ---------------------

    @Test
    void writePromptIncludesAbcdStructureAndLuyenTapNoteForActivityThree() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-5", "Hoạt động 3: Luyện tập (15 phút)", "Mời soạn tay.", "activity"));

        assertTrue(prompt.contains("a) Mục tiêu"));
        assertTrue(prompt.contains("b) Nội dung"));
        assertTrue(prompt.contains("c) Sản phẩm"));
        assertTrue(prompt.contains("d) Tổ chức thực hiện"));
        assertTrue(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
        assertTrue(prompt.contains("3 MỨC"));
        assertFalse(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"), "hoạt động cấp 1 không có bảng");
        assertFalse(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
    }

    @Test
    void writePromptPicksKhoiDongNoteForActivityOne() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-3", "Hoạt động 1: Khởi động/Xác định vấn đề (5 phút)", "Mời soạn tay.", "activity"));

        assertTrue(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
    }

    @Test
    void writePromptPicksVanDungNoteForActivityFour() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-7", "Hoạt động 4: Vận dụng (10 phút)", "Mời soạn tay.", "activity"));

        assertTrue(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
    }

    @Test
    void writePromptActivityKindWithoutRecognizedOrderSkipsSpecificNoteButKeepsStructure() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-9", "Hoạt động mở đầu tuỳ chỉnh", "Mời soạn tay.", "activity"));

        assertTrue(prompt.contains("a) Mục tiêu"));
        assertTrue(prompt.contains("d) Tổ chức thực hiện"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
    }
}
