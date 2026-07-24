package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassRepository {

    Classroom save(Classroom classroom);

    Optional<Classroom> findById(UUID id);

    SearchResult searchOwned(UUID ownerId, Subject subject, Integer grade, ClassStatus status, String q, int page, int size);

    record SearchResult(List<Classroom> items, long total) {
    }
}
