package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.classroom.ClassMember;

import java.util.UUID;

public interface ClassMemberRepository {

    ClassMember save(ClassMember member);

    long countByClassId(UUID classId);

    boolean existsByClassIdAndStudentId(UUID classId, UUID studentId);
}
