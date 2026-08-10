package com.edua.beeduasystem.presentation.dto.documentexport;

import com.edua.beeduasystem.service.documentexport.DocumentExportResult;

public record ExportPdfResponse(String fileName, String downloadUrl) {
    public static ExportPdfResponse from(DocumentExportResult result) {
        return new ExportPdfResponse(result.fileName(), result.downloadUrl());
    }
}

