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
    void selectPromptIncludesSectionContent() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "soạn lại hoạt động 3",
                List.of(new SectionInput("sec-1", "I. MỤC TIÊU", "NOI_DUNG_DAY_DU_DE_PHAN_BIET", "text"))));

        assertTrue(prompt.contains("NOI_DUNG_DAY_DU_DE_PHAN_BIET"), "bước chọn phải thấy content để phân biệt heading trùng nhau");
        assertTrue(prompt.contains("content:"), "phải có nhãn content: ở bước chọn");
    }

    @Test
    void selectPromptIncludesIdHeadingKindContentForEverySection() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "sửa",
                List.of(
                        new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung 1", "text"),
                        new SectionInput("sec-5", "Hoạt động 3: Luyện tập (20 phút)", "Nội dung 2", "text"))));

        assertTrue(prompt.contains("id: sec-1"));
        assertTrue(prompt.contains("heading: I. MỤC TIÊU"));
        assertTrue(prompt.contains("Nội dung 1"));
        assertTrue(prompt.contains("id: sec-5"));
        assertTrue(prompt.contains("heading: Hoạt động 3: Luyện tập (20 phút)"));
        assertTrue(prompt.contains("Nội dung 2"));
        assertTrue(prompt.contains("kind: text"));
    }

    @Test
    void selectPromptDisambiguatesDuplicateActivityNumberingWithContent() {
        String prompt = builder.buildSelectPrompt(new EditLessonSectionRequest(
                "soạn lại Hoạt động 4: Lập phương trình đường thẳng đi qua hai điểm (5 phút)",
                List.of(
                        new SectionInput("sec-sub4", "Hoạt động 4: Lập phương trình đường thẳng đi qua hai điểm (5 phút)",
                                "Nội dung tiểu hoạt động HĐ2", "subActivity"),
                        new SectionInput("sec-top4", "Hoạt động 4: Vận dụng (10 phút)",
                                "Nội dung hoạt động vận dụng", "activity"))));

        assertTrue(prompt.contains("Nội dung tiểu hoạt động HĐ2"));
        assertTrue(prompt.contains("Nội dung hoạt động vận dụng"));
        assertTrue(prompt.contains("KHÔNG được mặc định chọn theo khuôn mẫu quen thuộc"));
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
    // AI trả JSON có cấu trúc theo đúng kind (không còn tự mã hoá bảng bằng "‖"/"|"/"<br>" —
    // xem PromptBuilder javadoc) — mỗi test kiểm tra ĐÚNG MỘT khối "CẤU TRÚC RIÊNG" (và schema
    // JSON riêng của nó) được ghép vào, không lẫn khối của kind khác.

    @Test
    void writePromptIncludesLinesSchemaForTextKind() {
        String prompt = builder.buildWritePrompt("làm ngắn gọn",
                new SectionInput("sec-1", "I. MỤC TIÊU", "Nội dung", "text"), null);

        assertTrue(prompt.contains("kind \"text\""));
        assertTrue(prompt.contains("\"lines\""), "schema đầu ra kind text phải có field lines");
        assertFalse(prompt.contains("QUY ƯỚC BẢNG TRONG TEXT"), "quy ước text/‖/|/<br> cũ đã bỏ hoàn toàn");
        assertFalse(prompt.contains("kind \"materials\""));
        assertFalse(prompt.contains("kind \"subActivity\""));
        assertFalse(prompt.contains("kind \"activity\""));
    }

    @Test
    void writePromptIncludesEquipmentSchemaForMaterialsKind() {
        String prompt = builder.buildWritePrompt("thêm thiết bị",
                new SectionInput("sec-2", "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "‖ A ‖ B ‖\n| 1 | 2 |", "materials"), null);

        assertTrue(prompt.contains("kind \"materials\""));
        assertTrue(prompt.contains("\"equipment\""), "schema đầu ra kind materials phải có field equipment");
        assertTrue(prompt.contains("\"worksheets\""));
        assertFalse(prompt.contains("kind \"subActivity\""), "không cần nhồi quy tắc subActivity cho mục materials");
        assertFalse(prompt.contains("\"lines\""));
    }

    @Test
    void writePromptIncludesOrganizationSchemaForSubActivityKind() {
        String prompt = builder.buildWritePrompt("sửa tiểu hoạt động",
                new SectionInput("sec-4", "2.1 Tìm hiểu khái niệm", "‖ A ‖ B ‖\n| 1 | 2 |", "subActivity"), null);

        assertTrue(prompt.contains("kind \"subActivity\""));
        assertTrue(prompt.contains("\"organization\""), "schema đầu ra kind subActivity phải có field organization");
        assertTrue(prompt.contains("\"transfer\""));
        assertFalse(prompt.contains("kind \"materials\""), "không cần nhồi quy tắc materials cho mục subActivity");
    }

    @Test
    void writePromptIncludesOrganizationTextSchemaForActivityKind() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-5", "Hoạt động 3: Luyện tập (15 phút)", "Mời soạn tay.", "activity"), null);

        assertTrue(prompt.contains("kind \"activity\""));
        assertTrue(prompt.contains("\"organizationText\""), "schema đầu ra kind activity phải có field organizationText");
        assertFalse(prompt.contains("\"organization\":"), "kind activity dùng organizationText, không dùng organization 4 bước");
    }

    @Test
    void writePromptThreadsSingleSectionContentAndKind() {
        String prompt = builder.buildWritePrompt("thêm thiết bị",
                new SectionInput("sec-2", "II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", "‖ A ‖ B ‖\n| 1 | 2 |", "materials"), null);

        assertTrue(prompt.contains("kind: materials"));
        assertTrue(prompt.contains("‖ A ‖ B ‖"));
    }

    @Test
    void writePromptDefaultsMissingKindToText() {
        String prompt = builder.buildWritePrompt("sửa",
                new SectionInput("sec-3", "I. MỤC TIÊU", "Nội dung", null), null);

        assertTrue(prompt.contains("kind: text"));
        assertFalse(prompt.contains("kind: null"));
        assertTrue(prompt.contains("\"lines\""), "kind rỗng phải fallback về text (schema lines)");
    }

    // ---- buildWritePrompt kind "activity" (Hoạt động cấp 1 — HĐ1/3/4) ---------------------

    @Test
    void writePromptIncludesAbcdStructureAndLuyenTapNoteForActivityThree() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-5", "Hoạt động 3: Luyện tập (15 phút)", "Mời soạn tay.", "activity"), null);

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
                new SectionInput("sec-3", "Hoạt động 1: Khởi động/Xác định vấn đề (5 phút)", "Mời soạn tay.", "activity"), null);

        assertTrue(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
    }

    @Test
    void writePromptPicksVanDungNoteForActivityFour() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-7", "Hoạt động 4: Vận dụng (10 phút)", "Mời soạn tay.", "activity"), null);

        assertTrue(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
    }

    @Test
    void writePromptActivityKindWithoutRecognizedOrderSkipsSpecificNoteButKeepsStructure() {
        String prompt = builder.buildWritePrompt("soạn lại",
                new SectionInput("sec-9", "Hoạt động mở đầu tuỳ chỉnh", "Mời soạn tay.", "activity"), null);

        assertTrue(prompt.contains("a) Mục tiêu"));
        assertTrue(prompt.contains("d) Tổ chức thực hiện"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 1 (KHỞI ĐỘNG"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 3 (LUYỆN TẬP)"));
        assertFalse(prompt.contains("HOẠT ĐỘNG 4 (VẬN DỤNG)"));
    }
}
