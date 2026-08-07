package com.edua.beeduasystem.infrastructure.persistence;

import com.edua.beeduasystem.domain.model.classroom.ClassMember;
import com.edua.beeduasystem.domain.model.classroom.ClassMemberStatus;
import com.edua.beeduasystem.infrastructure.persistence.entity.ClassMemberEntity;
import com.edua.beeduasystem.infrastructure.persistence.repository.ClassMemberJpaRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
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
        entity.setStatus(member.status());
        entity.setJoinedAt(member.joinedAt() != null ? member.joinedAt() : Instant.now());
        entity.setRemovedAt(member.removedAt());
        entity.setRemovedBy(member.removedBy());
        entity.setRemovedReason(member.removedReason());
        entity.setRejoinedAt(member.rejoinedAt());
        return toDomain(jpa.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    public long countByClassId(UUID classId) {
        return jpa.countByClassIdAndStatus(classId, ClassMemberStatus.ENROLLED);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpa.existsByClassIdAndStudentIdAndStatus(classId, studentId, ClassMemberStatus.ENROLLED);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult findByClassId(UUID classId, int page, int size) {
        Page<ClassMemberEntity> result = jpa.findByClassIdAndStatusOrderByJoinedAtDesc(
                classId, ClassMemberStatus.ENROLLED, PageRequest.of(page, size));
        List<ClassMember> items = result.getContent().stream().map(JpaClassMemberRepository::toDomain).toList();
        return new PageResult(items, result.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<UUID> findAllStudentIds(UUID classId) {
        return jpa.findStudentIdsByClassIdAndStatus(classId, ClassMemberStatus.ENROLLED);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ClassMember> findAnyByClassIdAndStudentId(UUID classId, UUID studentId) {
        return jpa.findByClassIdAndStudentId(classId, studentId).map(JpaClassMemberRepository::toDomain);
    }

    private static ClassMember toDomain(ClassMemberEntity entity) {
        return new ClassMember(
                entity.getId(),
                entity.getClassId(),
                entity.getStudentId(),
                entity.getStatus(),
                entity.getJoinedAt(),
                entity.getRemovedAt(),
                entity.getRemovedBy(),
                entity.getRemovedReason(),
                entity.getRejoinedAt());
    }
}
