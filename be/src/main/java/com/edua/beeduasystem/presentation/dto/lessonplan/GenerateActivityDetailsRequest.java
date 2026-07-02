package com.edua.beeduasystem.presentation.dto.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.Materials;
import com.edua.beeduasystem.domain.model.lessonplan.Objectives;

import java.util.List;

/**
 * Yêu cầu điền chi tiết phần III. TIẾN TRÌNH DẠY HỌC (4 call song song).
 *
 * <p>{@code bookId/chapterId/lessonId} để BE nạp lại {@code knowledge_json} của bài.
 * Phần I ({@code objectives}) và phần II ({@code equipmentAndMaterials}) đã sinh trước đó
 * được gửi kèm làm NGỮ CẢNH để 4 call nhất quán (vd: tiểu hoạt động HĐ2 tham chiếu đúng
 * Phiếu học tập trong Phần II). {@code activities} là DÀN Ý (frame) cần đắp chi tiết —
 * mỗi top-level activity sẽ là một call AI riêng.
 */
public record GenerateActivityDetailsRequest(
        String bookId,
        String chapterId,
        String lessonId,
        String userPrompt,
        Objectives objectives,
        Materials equipmentAndMaterials,
        List<Activity5512> activities
) {
}
