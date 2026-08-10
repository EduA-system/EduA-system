package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.documentexport.ExportPdfRequest;
import com.edua.beeduasystem.presentation.dto.documentexport.ExportPdfResponse;
import com.edua.beeduasystem.service.documentexport.DocumentExportService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/document-exports")
@PreAuthorize("hasAnyRole('TEACHER', 'MODERATOR')")
public class DocumentExportController {

    private final DocumentExportService service;

    public DocumentExportController(DocumentExportService service) {
        this.service = service;
    }

    @PostMapping("/pdf")
    public ExportPdfResponse exportPdf(@RequestBody ExportPdfRequest request) {
        return ExportPdfResponse.from(service.exportPdf(
                request.type(),
                request.title(),
                request.documentHtml(),
                request.marginLeft(),
                request.marginRight()
        ));
    }
}

