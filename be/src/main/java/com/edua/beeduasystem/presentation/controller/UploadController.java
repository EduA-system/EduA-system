package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.upload.UploadResponse;
import com.edua.beeduasystem.service.upload.UploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
@Tag(name = "Uploads", description = "Upload file tham chiếu lên Cloudflare R2")
public class UploadController {

    private final UploadService uploadService;

    public UploadController(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping
    @Operation(
            summary = "Upload file tham chiếu",
            description = "Validate type (.docx/.pdf/.pptx/.png/.jpg/.jpeg) + ≤10MB, lưu R2, trả metadata.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "File đã upload",
                            content = @Content(schema = @Schema(implementation = UploadResponse.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "File sai type hoặc vượt 10MB (MSG13)")
            }
    )
    public UploadResponse upload(@RequestPart("file") MultipartFile file) throws java.io.IOException {
        return uploadService.upload(file.getBytes(), file.getOriginalFilename(), file.getContentType());
    }
}
