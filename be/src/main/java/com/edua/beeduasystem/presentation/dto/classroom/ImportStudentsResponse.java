package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassMemberViews;

import java.util.List;

public record ImportStudentsResponse(
        int addedCount,
        int createdCount,
        int rejoinedCount,
        int errorCount,
        List<ImportErrorDto> errors
) {
    public record ImportErrorDto(int row, String email, String reason, String message) {
        public static ImportErrorDto from(ClassMemberViews.ImportError view) {
            return new ImportErrorDto(view.row(), view.email(), view.reason(), view.message());
        }
    }

    public static ImportStudentsResponse from(ClassMemberViews.ImportResult view) {
        return new ImportStudentsResponse(
                view.addedCount(),
                view.createdCount(),
                view.rejoinedCount(),
                view.errorCount(),
                view.errors().stream().map(ImportErrorDto::from).toList());
    }
}
