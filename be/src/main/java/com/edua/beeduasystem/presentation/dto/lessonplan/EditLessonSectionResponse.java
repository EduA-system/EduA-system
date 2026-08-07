package com.edua.beeduasystem.presentation.dto.lessonplan;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Bản sửa do AI đề xuất cho một phần giáo án.
 *
 * <p>{@code data} là JSON có cấu trúc theo đúng {@code kind} của mục — {@code SubActivityEditContent}
 * (kind "subActivity"), {@code ActivityEditContent} (kind "activity"), {@code Materials} domain
 * (kind "materials"), hoặc {@code TextEditContent} (kind "text", còn lại). FE tự diễn giải
 * {@code data} theo {@code kind} rồi mới "làm đẹp" thành nội dung hiển thị (TipTap) — BE không
 * còn ép AI tự viết ra một chuỗi text/markdown lẫn quy ước bảng tự chế như trước.
 */
public record EditLessonSectionResponse(
        String targetId,
        String kind,
        JsonNode data
) {
}
