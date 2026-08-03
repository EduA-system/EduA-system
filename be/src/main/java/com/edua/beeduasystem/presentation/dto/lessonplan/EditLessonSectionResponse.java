package com.edua.beeduasystem.presentation.dto.lessonplan;

/**
 * Bản sửa do AI đề xuất cho một phần giáo án.
 *
 * <p>{@code content} là phần thân đã viết lại theo quy ước text/markdown/LaTeX của editor:
 * mỗi dòng là một đoạn, {@code **đậm**}, {@code - } cho bullet, {@code $...$}/{@code \[...\]}
 * cho công thức.
 */
public record EditLessonSectionResponse(
        String targetId,
        String content
) {
}
