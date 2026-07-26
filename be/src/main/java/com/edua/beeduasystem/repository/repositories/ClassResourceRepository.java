package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.classroom.ClassResource;

import java.util.List;
import java.util.UUID;

public interface ClassResourceRepository {

    /** Danh sach resource cua 1 lop, moi dang truoc (UC-41). */
    PageResult findByClassId(UUID classId, int page, int size);

    record PageResult(List<ClassResource> items, long total) {
    }
}
