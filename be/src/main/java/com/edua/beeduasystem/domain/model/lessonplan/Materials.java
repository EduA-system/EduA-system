package com.edua.beeduasystem.domain.model.lessonplan;

import java.util.List;

/**
 * Phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU của khung giáo án 5512 (Phụ lục IV, kiểu KNTT).
 *
 * <p>{@code equipment}: bảng thiết bị 2 cột (tiêu đề cột do AI chọn theo môn/bài).
 * {@code worksheets}: phiếu học tập (có thể rỗng nếu bài không cần). Bám mẫu thực tế
 * {@code resource/Bai-19...KNTT.docx}: mục II trình bày thiết bị dạng bảng và mỗi phiếu
 * học tập đóng khung riêng.
 */
public record Materials(
        EquipmentTable equipment,
        List<Worksheet> worksheets
) {

    /**
     * Bảng thiết bị 2 cột. {@code columns}: đúng 2 tiêu đề cột do AI chọn phù hợp môn học
     * (vd Hóa: "Dụng cụ" | "Hóa chất"; Lý: "Thiết bị, dụng cụ" | "Ghi chú"). {@code rows}:
     * mỗi dòng là một mục gồm đúng 2 ô khớp 2 cột.
     */
    public record EquipmentTable(
            List<String> columns,
            List<List<String>> rows
    ) {
    }

    /** Một phiếu học tập: tên + nội dung (nhiệm vụ + hệ thống câu hỏi). */
    public record Worksheet(
            String name,
            String content
    ) {
    }
}
