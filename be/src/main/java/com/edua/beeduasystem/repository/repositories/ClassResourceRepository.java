package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.classroom.ClassResource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClassResourceRepository {

    /** Danh sach resource cua 1 lop, moi dang truoc (UC-41). */
    PageResult findByClassId(UUID classId, int page, int size);

    /** Tao moi hoac cap nhat 1 resource (UC-38 Post / UC-39 Update). */
    ClassResource save(ClassResource resource);

    Optional<ClassResource> findById(UUID id);

    /** Xoa vinh vien 1 resource (UC-40 Delete). */
    void deleteById(UUID id);

    record PageResult(List<ClassResource> items, long total) {
    }
}
