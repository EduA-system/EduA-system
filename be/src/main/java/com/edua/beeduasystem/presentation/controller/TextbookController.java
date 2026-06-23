package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.textbook.TextbookCatalog;
import com.edua.beeduasystem.service.textbook.TextbookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/textbooks")
@Tag(name = "Textbooks", description = "Catalog SGK (KNTT) dạng cây book → chapter → lesson")
public class TextbookController {

    private final TextbookService textbookService;

    public TextbookController(TextbookService textbookService) {
        this.textbookService = textbookService;
    }

    @GetMapping
    @Operation(
            summary = "Lấy toàn bộ catalog SGK",
            description = "Trả cả cây book → chapter → lesson trong một call; FE tự lọc dropdown (BR-07).",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Catalog SGK",
                            content = @Content(schema = @Schema(implementation = TextbookCatalog.class))
                    )
            }
    )
    public TextbookCatalog getCatalog() {
        return textbookService.getCatalog();
    }
}
