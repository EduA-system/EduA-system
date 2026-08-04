package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.classroom.ClassMember;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ClassMemberJpaRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class JpaClassMemberRepository implements ClassMemberRepository {

    private final ClassMemberJpaRepository jpa;

    public JpaClassMemberRepository(ClassMemberJpaRepository jpa) {
        this.jpa = jpa;
    }

    @Override
    @Transactional
    public ClassMember save(ClassMember member) {
        ClassMemberEntity entity = jpa.findById(member.id()).orElseGet(ClassMemberEntity::new);
        entity.setId(member.id());
        entity.setClassId(member.classId());
        entity.setStudentId(member.studentId());
        entity.setJoinedAt(member.joinedAt() != null ? member.joinedAt() : Instant.now());
        return toDomain(jpa.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public long countByClassId(UUID classId) {
        return jpa.countByClassId(classId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpa.existsByClassIdAndStudentId(classId, studentId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult findByClassId(UUID classId, int page, int size) {
        Page<ClassMemberEntity> result = jpa.findByClassIdOrderByJoinedAtDesc(classId, PageRequest.of(page, size));
        List<ClassMember> items = result.getContent().stream().map(JpaClassMemberRepository::toDomain).toList();
        return new PageResult(items, result.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findAllStudentIds(UUID classId) {
        return jpa.findStudentIdsByClassId(classId);
    }

    @Override
    @Transactional
    public void deleteByClassIdAndStudentId(UUID classId, UUID studentId) {
        jpa.deleteByClassIdAndStudentId(classId, studentId);
    }

    @Override
    @Transactional
    public void deleteAllByStudentId(UUID studentId) {
        jpa.deleteByStudentId(studentId);
    }

    private static ClassMember toDomain(ClassMemberEntity entity) {
        return new ClassMember(entity.getId(), entity.getClassId(), entity.getStudentId(), entity.getJoinedAt());
    }
}
