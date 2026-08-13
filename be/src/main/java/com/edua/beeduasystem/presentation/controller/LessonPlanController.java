package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionResponse;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateActivityDetailsRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanStreamRequest;
import com.edua.beeduasystem.service.lessonplan.GenerateLessonPlanStreamUseCase;
import com.edua.beeduasystem.service.lessonplan.LessonPlanAdditionalRequestValidator;
import com.edua.beeduasystem.service.lessonplan.LessonPlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/lesson-plans")
@Tag(name = "Lesson Plans", description = "Sinh giáo án 5512 từ catalog SGK")
public class LessonPlanController {

    private final LessonPlanService lessonPlanService;
    private final GenerateLessonPlanStreamUseCase generateLessonPlanStreamUseCase;
    private final LessonPlanAdditionalRequestValidator additionalRequestValidator;

    public LessonPlanController(LessonPlanService lessonPlanService,
                                GenerateLessonPlanStreamUseCase generateLessonPlanStreamUseCase,
                                LessonPlanAdditionalRequestValidator additionalRequestValidator) {
        this.lessonPlanService = lessonPlanService;
        this.generateLessonPlanStreamUseCase = generateLessonPlanStreamUseCase;
        this.additionalRequestValidator = additionalRequestValidator;
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
                            content = @Content(schema = @Schema(implementation = LessonPlan5512.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu bookId/chapterId/lessonId hoặc bài chưa có nội dung số hóa"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi hoặc trả về sai định dạng")
            }
    )
    public LessonPlan5512 generate(@RequestBody GenerateLessonPlanRequest request) {
        return lessonPlanService.generateObjectives(request);
    }

    @PostMapping("/generate-materials")
    @Operation(
            summary = "Sinh phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU của giáo án 5512",
            description = "Đồng bộ: lấy nội dung SGK theo bookId/chapterId/lessonId, gọi AI "
                    + "sinh thiết bị/dụng cụ và phiếu học tập rồi trả về. Chưa lưu DB.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Giáo án với phần Thiết bị dạy học và học liệu đã sinh",
                            content = @Content(schema = @Schema(implementation = LessonPlan5512.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu bookId/chapterId/lessonId hoặc bài chưa có nội dung số hóa"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi hoặc trả về sai định dạng")
            }
    )
    public LessonPlan5512 generateMaterials(@RequestBody GenerateLessonPlanRequest request) {
        return lessonPlanService.generateMaterials(request);
    }

    @PostMapping("/generate-activities")
    @Operation(
            summary = "Sinh khung (dàn ý) phần III. TIẾN TRÌNH DẠY HỌC của giáo án 5512",
            description = "Đồng bộ: lấy nội dung SGK theo bookId/chapterId/lessonId, gọi AI "
                    + "sinh DÀN Ý 4 hoạt động (order/name/duration + tiểu hoạt động của HĐ2). "
                    + "Chưa điền a/b/c/d, chưa lưu DB.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Giáo án với phần Tiến trình dạy học (dàn ý) đã sinh",
                            content = @Content(schema = @Schema(implementation = LessonPlan5512.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu bookId/chapterId/lessonId hoặc bài chưa có nội dung số hóa"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi hoặc trả về sai định dạng")
            }
    )
    public LessonPlan5512 generateActivities(@RequestBody GenerateLessonPlanRequest request) {
        return lessonPlanService.generateActivitiesFrame(request);
    }

    @PostMapping("/generate-activities-details")
    @Operation(
            summary = "Điền CHI TIẾT phần III. TIẾN TRÌNH DẠY HỌC (4 call AI song song)",
            description = "Đồng bộ: từ dàn ý (activities) + ngữ cảnh Phần I/II gửi kèm, BE chạy 4 "
                    + "call AI song song (mỗi hoạt động một call) để điền a/b/c/d + tổ chức thực "
                    + "hiện (và tiểu hoạt động của HĐ2), rồi trả về. Chưa lưu DB.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Giáo án với phần Tiến trình dạy học đã điền chi tiết",
                            content = @Content(schema = @Schema(implementation = LessonPlan5512.class))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu ids/dàn ý hoặc bài chưa có nội dung số hóa"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi hoặc trả về sai định dạng")
            }
    )
    public LessonPlan5512 generateActivitiesDetails(@RequestBody GenerateActivityDetailsRequest request) {
        return lessonPlanService.generateActivitiesDetails(request);
    }

    @PostMapping("/edit-section")
    @Operation(
            summary = "Chỉnh sửa một hoặc nhiều phần giáo án bằng AI",
            description = "Đồng bộ: frontend gửi các phần đã trích từ editor hiện tại cùng yêu cầu của "
                    + "giáo viên. AI tự chọn một hoặc nhiều phần thực sự liên quan tới yêu cầu và trả bản "
                    + "viết lại cho TỪNG phần, để giáo viên xem trước và chấp nhận/bỏ TỪNG PHẦN riêng biệt.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Danh sách bản sửa đề xuất, mỗi phần tử ứng với một phần giáo án",
                            content = @Content(array = @ArraySchema(schema = @Schema(implementation = EditLessonSectionResponse.class)))
                    ),
                    @ApiResponse(responseCode = "400", description = "Thiếu yêu cầu hoặc danh sách phần giáo án không hợp lệ"),
                    @ApiResponse(responseCode = "502", description = "AI lỗi, trả JSON sai định dạng, không đề xuất gì, chọn phần không hợp lệ, hoặc trùng phần")
            }
    )
    public List<EditLessonSectionResponse> editSection(@RequestBody EditLessonSectionRequest request) {
        additionalRequestValidator.validateOrThrow(request == null ? null : request.instruction());
        return lessonPlanService.editSection(request);
    }

    @PostMapping("/generate-stream")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(
            summary = "Sinh giáo án 5512 theo STREAMING (async + STOMP)",
            description = "Trả 202 ngay; công việc chạy nền và đẩy tiến trình qua STOMP topic "
                    + "/topic/lesson-plan/{sessionId}. Thứ tự event: FRAME_READY (Phần I + II + dàn ý "
                    + "III) → tối đa 4 × (ACTIVITY_READY | ACTIVITY_FAILED) → DONE | ERROR. Né timeout "
                    + "proxy vì không chờ đủ 4 hoạt động trong một request đồng bộ dài.",
            responses = {
                    @ApiResponse(responseCode = "202", description = "Đã nhận; theo dõi tiến trình qua STOMP")
            }
    )
    public void generateStream(@RequestBody GenerateLessonPlanStreamRequest request) {
        generateLessonPlanStreamUseCase.start(request);
    }

}
