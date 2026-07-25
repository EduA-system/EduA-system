package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.library.HubComment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Truy cập bình luận Community Hub. Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}. */
public interface HubCommentRepository {

    HubComment save(HubComment comment);

    Optional<HubComment> findById(UUID id);

    /** Bình luận của một content, sắp theo thời gian tăng dần. */
    List<HubComment> findByLibraryContentId(UUID libraryContentId);

    long countByLibraryContentId(UUID libraryContentId);

    void deleteById(UUID id);
}
