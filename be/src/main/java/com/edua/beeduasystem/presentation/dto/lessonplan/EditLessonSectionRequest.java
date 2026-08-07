package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Yêu cầu AI chọn và viết lại đúng một phần trong giáo án hiện tại của editor.
 *
 * <p>{@code sections} do frontend trích trực tiếp từ TipTap document đang mở, nên đây là
 * nguồn sự thật mới nhất, bao gồm cả các chỉnh sửa thủ công của giáo viên.
 *
 * <p>{@code bookId}/{@code chapterId}/{@code lessonId} là {@code source} của giáo án (FE lấy từ
 * phiên streaming đang sống hoặc từ {@code payload.source} khi mở lại từ Personal Library) — CHO
 * PHÉP THIẾU (tài liệu cũ chưa từng lưu source, hoặc luồng khác). Khi có đủ, BE nạp lại
 * {@code knowledge_json} của bài để bước viết bám đúng kiến thức SGK thay vì bịa nội dung khi
 * viết mới hoàn toàn một mục còn trống — xem {@code LessonPlanService#editSection}.
 */
public record EditLessonSectionRequest(
        String instruction,
        List<SectionInput> sections,
        String bookId,
        String chapterId,
        String lessonId
) {
    /** Tiện dùng khi không có ngữ cảnh SGK (vd test chỉ quan tâm phần chọn/viết mục). */
    public EditLessonSectionRequest(String instruction, List<SectionInput> sections) {
        this(instruction, sections, null, null, null);
    }

    public record SectionInput(
            String id,
            String heading,
            String content,
            /** Cấu trúc bảng mà mục đang chứa — "text" (không bảng), "materials" (bảng thiết
             * bị/phiếu học tập), "subActivity" (bảng tổ chức/sản phẩm của tiểu hoạt động HĐ2),
             * "activity" (Hoạt động cấp 1 — HĐ1/3/4, cấu trúc a/b/c/d, không bảng). FE tự phát
             * hiện qua {@code lessonSections.ts#SectionKind}; null/không nhận diện được thì coi
             * như "text". */
            String kind
    ) {
    }
}
