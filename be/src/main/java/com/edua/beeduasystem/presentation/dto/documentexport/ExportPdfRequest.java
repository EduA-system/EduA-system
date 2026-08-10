package com.edua.beeduasystem.presentation.dto.documentexport;

public record ExportPdfRequest(
        String type,
        String title,
        String documentHtml,
        Integer marginLeft,
        Integer marginRight
) {
}

