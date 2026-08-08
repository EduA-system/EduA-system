package com.edua.beeduasystem.presentation.dto.practiceexam;

/**
 * Yêu cầu sinh lại ĐÚNG MỘT câu hỏi (nút "Thử lại" trên 1 câu lỗi/pending trong editor).
 * {@code request} giữ nguyên toàn bộ ngữ cảnh đề (phạm vi SGK, độ khó, mục tiêu...) để
 * câu sinh lại vẫn bám đúng đề; {@code order}/{@code type}/{@code scoreCentiPoints} là
 * của riêng câu cần sinh lại (lấy từ stub đã có ở PLAN_READY).
 */
public record RegenerateQuestionRequest(PracticeExamRequest request, int order, String type, int scoreCentiPoints) {
}
