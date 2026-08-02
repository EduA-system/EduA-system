package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassViews;

import java.util.List;

public record ClassPageDto(
        List<ClassSummaryDto> items,
        int page,
        int size,
        long total
) {
    public static ClassPageDto from(ClassViews.Page<ClassViews.ClassSummary> view) {
        return new ClassPageDto(
                view.items().stream().map(ClassSummaryDto::from).toList(),
                view.page(),
                view.size(),
                view.total());
    }
}
