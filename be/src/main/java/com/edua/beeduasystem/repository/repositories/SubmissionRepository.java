package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.classroom.Submission;
import com.edua.beeduasystem.domain.model.classroom.SubmissionFile;
import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface SubmissionRepository {

    Optional<SubmissionWithFiles> findByResourceAndStudent(UUID classResourceId, UUID studentId);

    /** Upsert theo unique (classResourceId, studentId); thay the toan bo file cu (BR-36). */
    SubmissionWithFiles upsert(Submission submission, List<SubmissionFile> files);

    void deleteByResourceAndStudent(UUID classResourceId, UUID studentId);

    /** Trang thai nop bai (ON_TIME/LATE) cua 1 hoc sinh cho nhieu resource, dung cho GET /resources (UC-41). */
    Map<UUID, SubmissionStatus> findStatusesByResourceIds(List<UUID> classResourceIds, UUID studentId);

    record SubmissionWithFiles(Submission submission, List<SubmissionFile> files) {
    }
}
