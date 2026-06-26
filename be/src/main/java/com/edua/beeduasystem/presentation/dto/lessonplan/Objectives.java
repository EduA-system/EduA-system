package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Phần I. MỤC TIÊU của khung giáo án 5512 (Phụ lục IV, kiểu KNTT).
 *
 * <p>Năng lực tách 2 tầng: {@code general} (năng lực chung) + {@code specific}
 * (năng lực đặc thù môn học). Khớp {@code resource/khung-giao-an-5512.md} mục 3.
 */
public record Objectives(
        List<String> knowledge,
        Competencies competencies,
        List<String> qualities
) {

    /** 2. Về năng lực — chung + đặc thù. */
    public record Competencies(
            List<String> general,
            List<String> specific
    ) {
    }
}
