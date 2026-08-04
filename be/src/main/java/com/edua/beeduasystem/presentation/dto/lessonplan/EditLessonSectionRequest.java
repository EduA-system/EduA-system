package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Yêu cầu AI chọn và viết lại đúng một phần trong giáo án hiện tại của editor.
 *
 * <p>{@code sections} do frontend trích trực tiếp từ TipTap document đang mở, nên đây là
 * nguồn sự thật mới nhất, bao gồm cả các chỉnh sửa thủ công của giáo viên.
 */
public record EditLessonSectionRequest(
        String instruction,
        List<SectionInput> sections
) {
    public record SectionInput(
            String id,
            String heading,
            String content
    ) {
    }
}
