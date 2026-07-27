package com.edua.beeduasystem.presentation.controller;

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
    @Operation(summary = "View Weekly Schedule (UC-80)", description = "Teacher: lịch của mình. Moderator: lịch cả subject. Mặc định 4 tuần trước tới 8 tuần sau.")
    public WeeklyTaskViews.Schedule schedule(
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        LocalDate resolvedFrom = from != null ? from : LocalDate.now().minusWeeks(4);
        LocalDate resolvedTo = to != null ? to : LocalDate.now().plusWeeks(8);
        return service.schedule(resolvedFrom, resolvedTo);
    }

    @GetMapping("/{id}")
    @Operation(summary = "View Assigned Task (UC-83) / View Lesson Plan Detail (UC-87)")
    public WeeklyTaskViews.Detail get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Create Weekly Task (UC-81)")
    public WeeklyTaskViews.Detail create(@Valid @RequestBody CreateWeeklyTaskRequest r) {
        return service.create(r.teacherId(), r.weekStartDate(), r.scopeDescription(), r.deadline());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('MODERATOR')")
    @Operation(summary = "Edit Weekly Task (UC-82)", description = "Chỉ sửa được trước hạn nộp (BR-47).")
    public WeeklyTaskViews.Detail update(@PathVariable UUID id, @Valid @RequestBody UpdateWeeklyTaskRequest r) {
        return service.update(id, r.teacherId(), r.weekStartDate(), r.scopeDescription(), r.deadline());
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
    @Operation(summary = "View Lesson Plan Approval List (UC-86)")
    public WeeklyTaskViews.Page moderationQueue(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listModerationQueue(page, size);
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
