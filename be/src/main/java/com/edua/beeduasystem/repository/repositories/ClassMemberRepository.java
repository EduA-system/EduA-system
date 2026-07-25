package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.classroom.ClassMember;

import java.util.List;
import java.util.UUID;

public interface ClassMemberRepository {

    ClassMember save(ClassMember member);

    long countByClassId(UUID classId);

    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);

    /** Danh sach thanh vien cua 1 lop, moi tham gia truoc. */
    PageResult findByClassId(UUID classId, int page, int size);

    record PageResult(List<ClassMember> items, long total) {
    }
}
