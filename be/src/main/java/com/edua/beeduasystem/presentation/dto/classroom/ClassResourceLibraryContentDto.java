package com.edua.beeduasystem.presentation.dto.classroom;

import com.edua.beeduasystem.domain.model.library.LibraryContentType;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.service.classroom.ClassResourceViews;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.UUID;

/** Noi dung thu vien duoc tra ve trong pham vi mot tai nguyen cua lop. */
public record ClassResourceLibraryContentDto(
        UUID id,
        LibraryContentType type,
        String title,
        Subject subject,
        JsonNode payload,
        String thumbnailUrl
) {
    public static ClassResourceLibraryContentDto from(ClassResourceViews.LibraryContentDetail view) {
        return new ClassResourceLibraryContentDto(
                view.id(), view.type(), view.title(), view.subject(), view.payload(), view.thumbnailUrl());
    }
}
