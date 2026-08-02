package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.service.classroom.ClassMemberViews;

import java.util.List;

public record ClassMemberPageDto(
        List<ClassMemberDto> items,
        int page,
        int size,
        long total
) {
    public static ClassMemberPageDto from(ClassMemberViews.Page view) {
        return new ClassMemberPageDto(
                view.items().stream().map(ClassMemberDto::from).toList(),
                view.page(),
                view.size(),
                view.total());
    }
}
