package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.classroom.SubmissionStatus;
import com.edua.beeduasystem.service.classroom.SubmissionViews;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TeacherSubmissionDetailDto(
        UUID studentId,
        String studentName,
        String textContent,
        List<FileDto> files,
        SubmissionStatus status,
        Instant firstSubmittedAt,
        Instant submittedAt
) {
    public record FileDto(
            String fileName,
            String url,
            String contentType,
            Long sizeBytes
    ) {
        static FileDto from(SubmissionViews.FileDetail file) {
            return new FileDto(file.fileName(), file.url(), file.contentType(), file.sizeBytes());
        }
    }

    public static TeacherSubmissionDetailDto from(SubmissionViews.TeacherDetail view) {
        return new TeacherSubmissionDetailDto(
                view.studentId(),
                view.studentName(),
                view.textContent(),
                view.files().stream().map(FileDto::from).toList(),
                view.status(),
                view.firstSubmittedAt(),
                view.submittedAt());
    }
}
