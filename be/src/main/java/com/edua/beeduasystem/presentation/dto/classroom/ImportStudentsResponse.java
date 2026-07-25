package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassMemberViews;

import java.util.List;

public record ImportStudentsResponse(
        int addedCount,
        int skippedCount,
        List<SkippedRowDto> skipped
) {
    public record SkippedRowDto(int row, String email, String reason) {
        public static SkippedRowDto from(ClassMemberViews.SkippedRow view) {
            return new SkippedRowDto(view.row(), view.email(), view.reason());
        }
    }

    public static ImportStudentsResponse from(ClassMemberViews.ImportResult view) {
        return new ImportStudentsResponse(
                view.addedCount(),
                view.skippedCount(),
                view.skipped().stream().map(SkippedRowDto::from).toList());
    }
}
