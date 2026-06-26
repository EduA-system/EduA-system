package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.LessonPlan5512Dto;
import com.edua.beeduasystem.service.lessonplan.LessonPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/lesson-plans")
@Tag(name = "Lesson Plans", description = "Sinh giáo án 5512 từ catalog SGK")
public class LessonPlanController {

    private final LessonPlanService lessonPlanService;

    public LessonPlanController(LessonPlanService lessonPlanService) {
        this.lessonPlanService = lessonPlanService;
    }

    @PostMapping("/generate")
    @Operation(
            summary = "Sinh phần I. MỤC TIÊU của giáo án 5512",
            description = "Đồng bộ: lấy nội dung SGK theo bookId/chapterId/lessonId, gọi AI "
                    + "sinh mục tiêu (kiến thức, năng lực, phẩm chất) rồi trả về. Chưa lưu DB.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Giáo án với phần Mục tiêu đã sinh",
                            content = @Content(schema = @Schema(implementation = LessonPlan5512Dto.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu bookId/chapterId/lessonId hoặc bài chưa có nội dung số hóa"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi hoặc trả về sai định dạng")
            }
    )
    public LessonPlan5512Dto generate(@RequestBody GenerateLessonPlanRequest request) {
        return lessonPlanService.generateObjectives(request);
    }
}
