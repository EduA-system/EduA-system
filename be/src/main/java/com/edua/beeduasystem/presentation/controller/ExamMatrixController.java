package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.exam.ExamMatrixWorkspace;
import com.edua.beeduasystem.domain.model.exam.ExamScope;
import com.edua.beeduasystem.presentation.dto.exam.ExamScopeRequest;
import com.edua.beeduasystem.presentation.dto.exam.GenerateExamMatrixRequest;
import com.edua.beeduasystem.service.exam.ExamGenerationService;
import com.edua.beeduasystem.service.exam.ExamScopeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/exams")
@Tag(name = "Exam matrix", description = "Tạo Ma trận và Bản đặc tả tạm thời, không lưu DB")
public class ExamMatrixController {
    private final ExamScopeService scopeService;
    private final ExamGenerationService generationService;

    public ExamMatrixController(ExamScopeService scopeService, ExamGenerationService generationService) {
        this.scopeService = scopeService;
        this.generationService = generationService;
    }

    @PostMapping("/scope-preview")
    @Operation(summary = "Xem phạm vi SGK ước lượng theo cấu hình đề")
    public ExamScope previewScope(@RequestBody ExamScopeRequest request) {
        if (request == null) throw new IllegalArgumentException("Thiếu thông tin phạm vi.");
        return scopeService.preview(request.subject(), request.grade(), request.examType());
    }

    @PostMapping("/matrix-specification/generate")
    @Operation(summary = "Sinh Ma trận và Bản đặc tả, không lưu DB")
    public ExamMatrixWorkspace generate(@RequestBody GenerateExamMatrixRequest request) {
        return generationService.generate(request);
    }
}
