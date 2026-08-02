package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassResourceViews;

import java.util.List;

public record ClassResourcePageDto(
        List<ClassResourceSummaryDto> items,
        int page,
        int size,
        long total
) {
    public static ClassResourcePageDto from(ClassResourceViews.Page view) {
        return new ClassResourcePageDto(
                view.items().stream().map(ClassResourceSummaryDto::from).toList(),
                view.page(),
                view.size(),
                view.total());
    }
}
