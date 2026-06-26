package com.edua.beeduasystem.domain.model.lessonplan;

import java.util.List;

/**
 * Phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU của khung giáo án 5512 (Phụ lục IV, kiểu KNTT).
 *
 * <p>{@code equipment}: thiết bị/dụng cụ/hóa chất. {@code worksheets}: phiếu học tập
 * (có thể rỗng nếu bài không cần). Khớp {@code resource/khung-giao-an-5512.md} mục 3
 * ({@code equipmentAndMaterials}).
 */
public record Materials(
        List<String> equipment,
        List<Worksheet> worksheets
) {

    /** Một phiếu học tập: tên + nội dung (nhiệm vụ + hệ thống câu hỏi). */
    public record Worksheet(
            String name,
            String content
    ) {
    }
}
