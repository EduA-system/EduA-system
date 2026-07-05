package com.edua.beeduasystem.domain.model.blog;

/**
 * Trạng thái bài blog. Danh sách/chi tiết công khai chỉ trả {@link #PUBLISHED}.
 * Gỡ/xóa là soft-delete để giữ audit (lý do + người gỡ) và có thể mở rộng thông báo sau.
 */
public enum BlogPostStatus {
    /** Đăng trực tiếp, hiển thị công khai (BR-20). */
    PUBLISHED,
    /** Moderator gỡ vì vi phạm — kèm lý do, đúng môn phụ trách (BR-21). */
    REMOVED_BY_MODERATOR,
    /** Tác giả tự xóa bài của mình (BR-16). */
    DELETED_BY_AUTHOR
}
