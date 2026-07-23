package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.library.LibraryContent;
import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LibraryContentRepository {
    LibraryContent save(LibraryContent content);
    Optional<LibraryContent> findActiveById(UUID id);
    SearchResult search(UUID ownerId, LibraryContentType type, Subject subject, Integer grade, String q, int page, int size, boolean titleAscending);
    record SearchResult(List<LibraryContent> items, long total) { }
}
