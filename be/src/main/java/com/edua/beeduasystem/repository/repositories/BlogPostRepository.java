package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.blog.BlogPost;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Truy cập bài blog. Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}.
 */
public interface BlogPostRepository {

    BlogPost save(BlogPost post);

    /** Tìm theo id bất kể trạng thái (dùng cho owner-check trước khi sửa/xóa). */
    Optional<BlogPost> findById(UUID id);

    /** Tìm bài đang PUBLISHED (dùng cho đọc công khai). */
    Optional<BlogPost> findPublishedById(UUID id);

    /**
     * Danh sách bài PUBLISHED, lọc tùy chọn theo môn/tác giả/từ khóa tiêu đề, sắp theo mới nhất.
     * {@code null} ở filter nào = bỏ qua filter đó.
     */
    SearchResult search(Subject subject, UUID authorId, String q, int page, int size);

    record SearchResult(List<BlogPost> items, long total) {
    }
}
