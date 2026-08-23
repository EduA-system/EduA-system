package com.edua.beeduasystem.presentation.dto.statistics;

import com.edua.beeduasystem.service.documentexport.DocumentExportResult;

public record StatisticsReportDto(String fileName, String downloadUrl) {
    public static StatisticsReportDto from(DocumentExportResult result) {
        return new StatisticsReportDto(result.fileName(), result.downloadUrl());
    }
}
