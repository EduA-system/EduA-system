package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.weeklytask.BulkCreateWeeklyTaskRequest;
import com.edua.beeduasystem.presentation.dto.weeklytask.CreateWeeklyTaskRequest;
import com.edua.beeduasystem.presentation.dto.weeklytask.RejectWeeklyTaskRequest;
import com.edua.beeduasystem.presentation.dto.weeklytask.SubmitWeeklyTaskRequest;
import com.edua.beeduasystem.presentation.dto.weeklytask.UpdateWeeklyTaskRequest;
import com.edua.beeduasystem.service.weeklytask.WeeklyTaskService;
import com.edua.beeduasystem.service.weeklytask.WeeklyTaskViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Weekly Task (UC-80..89): Moderator giao yêu cầu giáo án cho Teacher cùng subject, kèm hạn nộp;
 * Teacher nộp/rút giáo án; Moderator duyệt trong hàng đợi theo subject.
 */
@RestController
@RequestMapping("/api/weekly-tasks")
@PreAuthorize("hasAnyRole('TEACHER', 'MODERATOR')")
@Tag(name = "Weekly Tasks", description = "Giao/nộp/duyệt giáo án theo tuần (UC-80..89)")
public class WeeklyTaskController {

    private final WeeklyTaskService service;

    public WeeklyTaskController(WeeklyTaskService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "View Weekly Schedule (UC-80)", description = "Teacher: lịch của mình, mọi khối. Moderator: lịch cả subject, lọc theo khối nếu truyền `grade` (BR-51). Mặc định 4 tuần trước tới 8 tuần sau.")
    public WeeklyTaskViews.Schedule schedule(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) Integer grade) {
        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusWeeks(4);
        LocalDate resolvedTo = to != null ? to : LocalDate.now().plusWeeks(8);
        return service.schedule(resolvedFrom, resolvedTo, grade);
    }

    @GetMapping("/{id}")
    @Operation(summary = "View Assigned Task (UC-83) / View Lesson Plan Detail (UC-87)")
    public WeeklyTaskViews.Detail get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Create Weekly Task (UC-81)", description = "Khối bắt buộc (BR-51); Chương/Bài chọn từ danh mục SGK (BR-53); hạn nộp server tự tính (BR-52).")
    public WeeklyTaskViews.Detail create(@Valid @RequestBody CreateWeeklyTaskRequest r) {
        return service.create(r.teacherId(), r.weekStartDate(), r.grade(), r.scopeDescription(),
                r.textbookCode(), r.chapterCode(), r.lessonCode());
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Bulk Create Weekly Tasks (UC-81)",
            description = "Giao 1 bài (1 ô lịch tuần) cho mọi Teacher active cùng subject dạy đúng khối trong 1 tuần (BR-51/BR-53).")
    public WeeklyTaskViews.BulkResult bulkCreate(@Valid @RequestBody BulkCreateWeeklyTaskRequest r) {
        List<WeeklyTaskService.LessonRequest> lessons = r.lessons().stream()
                .map(l -> new WeeklyTaskService.LessonRequest(l.scopeDescription(), l.chapterCode(), l.lessonCode()))
                .toList();
        return service.bulkCreate(r.weekStartDate(), r.grade(), r.textbookCode(), lessons);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Edit Weekly Task (UC-82)", description = "Chỉ sửa được trước hạn nộp (BR-47). Khối giữ nguyên; hạn nộp server tự tính lại (BR-52); Chương/Bài sửa được (BR-53).")
    public WeeklyTaskViews.Detail update(@PathVariable UUID id, @Valid @RequestBody UpdateWeeklyTaskRequest r) {
        return service.update(id, r.teacherId(), r.weekStartDate(), r.scopeDescription(),
                r.textbookCode(), r.chapterCode(), r.lessonCode());
    }

    @PostMapping("/{id}/submission")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Submit Lesson Plan for Weekly Task (UC-84)")
    public WeeklyTaskViews.Detail submit(@PathVariable UUID id, @RequestBody SubmitWeeklyTaskRequest r) {
        return service.submit(id, r.libraryContentId(), r.documentUrl(), r.documentName());
    }

    @DeleteMapping("/{id}/submission")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Unsubmit Lesson Plan for Weekly Task (UC-85)")
    public WeeklyTaskViews.Detail unsubmit(@PathVariable UUID id) {
        return service.unsubmit(id);
    }

    @GetMapping("/moderation-queue")
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "View Lesson Plan Approval List (UC-86)",
            description = "Lọc theo khối (`grade`), Chương (`chapterCode`) và/hoặc Bài (`lessonCode`) — chọn từ dropdown danh mục SGK, không phải tìm tự do (BR-51/BR-53).")
    public WeeklyTaskViews.Page moderationQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) String chapterCode,
            @RequestParam(required = false) String lessonCode) {
        return service.listModerationQueue(page, size, grade, chapterCode, lessonCode);
    }

    @PostMapping("/{id}/approval")
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Approve Lesson Plan (UC-88)")
    public WeeklyTaskViews.Detail approve(@PathVariable UUID id) {
        return service.approve(id);
    }

    @PostMapping("/{id}/rejection")
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Reject Lesson Plan (UC-89)")
    public WeeklyTaskViews.Detail reject(@PathVariable UUID id, @RequestBody RejectWeeklyTaskRequest r) {
        return service.reject(id, r.reason());
    }
}
