package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.presentation.dto.classroom.AddStudentRequest;
import com.edua.beeduasystem.presentation.dto.classroom.ClassDetailDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassMemberDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassMemberPageDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassPageDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassResourceAttachmentRequest;
import com.edua.beeduasystem.presentation.dto.classroom.ClassResourceLibraryContentDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassResourcePageDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassResourceSummaryDto;
import com.edua.beeduasystem.presentation.dto.classroom.CreateClassRequest;
import com.edua.beeduasystem.presentation.dto.classroom.ImportStudentsResponse;
import com.edua.beeduasystem.presentation.dto.classroom.PostClassResourceRequest;
import com.edua.beeduasystem.presentation.dto.classroom.RemoveStudentRequest;
import com.edua.beeduasystem.presentation.dto.classroom.RemoveStudentResponse;
import com.edua.beeduasystem.presentation.dto.classroom.SubmissionDetailDto;
import com.edua.beeduasystem.presentation.dto.classroom.SubmissionFileRequest;
import com.edua.beeduasystem.presentation.dto.classroom.SubmissionRosterDto;
import com.edua.beeduasystem.presentation.dto.classroom.SubmitAssignmentRequest;
import com.edua.beeduasystem.presentation.dto.classroom.TeacherSubmissionDetailDto;
import com.edua.beeduasystem.presentation.dto.classroom.UpdateClassRequest;
import com.edua.beeduasystem.presentation.dto.classroom.UpdateClassResourceRequest;
import com.edua.beeduasystem.presentation.dto.classroom.UpdateClassStatusRequest;
import com.edua.beeduasystem.service.classroom.ClassEnrollmentService;
import com.edua.beeduasystem.service.classroom.ClassManagementService;
import com.edua.beeduasystem.service.classroom.ClassResourceService;
import com.edua.beeduasystem.service.classroom.ClassResourceViews;
import com.edua.beeduasystem.service.classroom.SubmissionService;
import com.edua.beeduasystem.service.classroom.SubmissionViews;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/classes")
@Tag(name = "Class Management", description = "Teacher quan ly lop hoc theo Class Hub (UC-29/30/31/32/33), them hoc sinh (UC-36), Student xem lop da enrolled (UC-35), xem class resources (UC-41) va nop/thu hoi bai (UC-47/48), Teacher xem danh sach/chi tiet bai nop cua hoc sinh (UC-44/45)")
public class ClassController {

    private final ClassManagementService classManagementService;
    private final ClassEnrollmentService classEnrollmentService;
    private final ClassResourceService classResourceService;
    private final SubmissionService submissionService;

    public ClassController(ClassManagementService classManagementService,
                           ClassEnrollmentService classEnrollmentService,
                           ClassResourceService classResourceService,
                           SubmissionService submissionService) {
        this.classManagementService = classManagementService;
        this.classEnrollmentService = classEnrollmentService;
        this.classResourceService = classResourceService;
        this.submissionService = submissionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Danh sách lớp của teacher (UC-29)")
    public ClassPageDto list(
            @RequestParam(required = false) Subject subject,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) ClassStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ClassPageDto.from(classManagementService.listOwnedClasses(subject, grade, status, q, page, size));
    }

    @GetMapping("/enrolled")
    @Operation(summary = "Danh sách lớp học sinh đang enrolled (UC-35)")
    public ClassPageDto listEnrolled(
            @RequestParam(required = false) Subject subject,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) ClassStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ClassPageDto.from(classManagementService.listEnrolledClasses(subject, grade, status, q, page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Tạo lớp mới (UC-30)")
    public ClassDetailDto create(@Valid @RequestBody CreateClassRequest request) {
        return ClassDetailDto.from(classManagementService.createClass(
                request.name(), request.subject(), request.grade(), request.description()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết lớp / Class Hub (UC-33)")
    public ClassDetailDto detail(@PathVariable UUID id) {
        return ClassDetailDto.from(classManagementService.getDetail(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Cập nhật thông tin lớp (UC-31)")
    public ClassDetailDto update(@PathVariable UUID id, @Valid @RequestBody UpdateClassRequest request) {
        return ClassDetailDto.from(classManagementService.updateClass(
                id, request.name(), request.subject(), request.grade(), request.description()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Chuyển trạng thái lớp Active / Inactive (UC-32)")
    public ClassDetailDto updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateClassStatusRequest request) {
        return ClassDetailDto.from(classManagementService.updateStatus(id, request.status()));
    }

    @GetMapping("/{id}/members")
    @Operation(summary = "Danh sách thành viên lớp (màn Class Members, tiền đề của UC-36)")
    public ClassMemberPageDto members(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ClassMemberPageDto.from(classEnrollmentService.listMembers(id, page, size));
    }

    @PostMapping("/{id}/members")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Thêm 1 học sinh bằng Gmail (UC-36 Normal Flow). Gmail mới sẽ tạo học sinh mới; Gmail đã có phải khớp hồ sơ.")
    public ClassMemberDto addStudent(@PathVariable UUID id, @Valid @RequestBody AddStudentRequest request) {
        return ClassMemberDto.from(classEnrollmentService.addStudent(
                id,
                request.fullName(),
                request.phoneNumber(),
                request.dateOfBirth(),
                request.email()));
    }

    @DeleteMapping("/{id}/members/{studentId}")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Gỡ mềm học sinh khỏi lớp (UC-37). Chỉ chuyển membership lớp hiện tại sang REMOVED; giữ account, role và dữ liệu lớp.")
    public RemoveStudentResponse removeStudent(@PathVariable UUID id,
                                               @PathVariable UUID studentId,
                                               @RequestBody(required = false) RemoveStudentRequest request) {
        String reason = request != null ? request.reason() : null;
        return RemoveStudentResponse.from(classEnrollmentService.removeStudent(id, studentId, reason));
    }

    @PostMapping("/{id}/members/import")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Import học sinh từ file .csv/.xlsx, cột bắt buộc \"gmail\" (UC-36 Alt Flow)")
    public ImportStudentsResponse importMembers(@PathVariable UUID id, @RequestPart("file") MultipartFile file) {
        return ImportStudentsResponse.from(classEnrollmentService.importStudents(id, file));
    }

    @GetMapping("/{id}/resources")
    @Operation(summary = "Xem danh sách resource của lớp đã enrolled (UC-41)")
    public ClassResourcePageDto resources(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ClassResourcePageDto.from(classResourceService.listResources(id, page, size));
    }

    @GetMapping("/{id}/resources/{resourceId}/library-content")
    @Operation(summary = "Mo noi dung thu vien da chia se trong lop (chi xem)")
    public ClassResourceLibraryContentDto libraryContent(
            @PathVariable UUID id,
            @PathVariable UUID resourceId) {
        return ClassResourceLibraryContentDto.from(classResourceService.getLibraryContent(id, resourceId));
    }

    @PostMapping("/{id}/resources")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Đăng resource/assignment mới vào lớp (UC-38)")
    public ClassResourceSummaryDto postResource(@PathVariable UUID id, @Valid @RequestBody PostClassResourceRequest request) {
        return ClassResourceSummaryDto.from(classResourceService.postResource(
                id,
                request.title(),
                request.description(),
                request.sourceType(),
                request.sourceLibraryContentId(),
                toAttachmentInput(request.attachment()),
                request.submissionEnabled(),
                request.deadline()));
    }

    @PatchMapping("/{id}/resources/{resourceId}")
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Sửa resource đã đăng (UC-39)")
    public ClassResourceSummaryDto updateResource(
            @PathVariable UUID id,
            @PathVariable UUID resourceId,
            @Valid @RequestBody UpdateClassResourceRequest request) {
        return ClassResourceSummaryDto.from(classResourceService.updateResource(
                id,
                resourceId,
                request.title(),
                request.description(),
                toAttachmentInput(request.attachment()),
                request.submissionEnabled(),
                request.deadline()));
    }

    @DeleteMapping("/{id}/resources/{resourceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")
    @Operation(summary = "Xóa resource khỏi lớp (UC-40)")
    public void deleteResource(@PathVariable UUID id, @PathVariable UUID resourceId) {
        classResourceService.deleteResource(id, resourceId);
    }

    @PostMapping("/{id}/resources/{resourceId}/submission")
    @Operation(summary = "Nộp bài tập, text và/hoặc file (UC-47)")
    public SubmissionDetailDto submit(
            @PathVariable UUID id,
            @PathVariable UUID resourceId,
            @Valid @RequestBody SubmitAssignmentRequest request) {
        return SubmissionDetailDto.from(submissionService.submit(
                id, resourceId, request.textContent(), toFileInputs(request.files())));
    }

    @DeleteMapping("/{id}/resources/{resourceId}/submission")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Thu hồi bài nộp (UC-48)")
    public void unsubmit(@PathVariable UUID id, @PathVariable UUID resourceId) {
        submissionService.unsubmit(id, resourceId);
    }

    @GetMapping("/{id}/resources/{resourceId}/submission")
    @Operation(summary = "Xem lại bài đã nộp của chính mình (hỗ trợ FE, ngoài SRS)")
    public SubmissionDetailDto mySubmission(@PathVariable UUID id, @PathVariable UUID resourceId) {
        return SubmissionDetailDto.from(submissionService.getOwnSubmission(id, resourceId));
    }

    @GetMapping("/{id}/resources/{resourceId}/submissions")
    @Operation(summary = "Xem danh sách bài nộp của học sinh trong lớp (UC-44)")
    public SubmissionRosterDto submissions(@PathVariable UUID id, @PathVariable UUID resourceId) {
        return SubmissionRosterDto.from(submissionService.listSubmissions(id, resourceId));
    }

    @GetMapping("/{id}/resources/{resourceId}/submissions/{studentId}")
    @Operation(summary = "Xem chi tiết bài nộp của 1 học sinh (UC-45)")
    public TeacherSubmissionDetailDto submissionDetail(
            @PathVariable UUID id, @PathVariable UUID resourceId, @PathVariable UUID studentId) {
        return TeacherSubmissionDetailDto.from(submissionService.getSubmissionDetail(id, resourceId, studentId));
    }

    private static ClassResourceViews.AttachmentInput toAttachmentInput(ClassResourceAttachmentRequest attachment) {
        if (attachment == null) {
            return null;
        }
        return new ClassResourceViews.AttachmentInput(
                attachment.url(), attachment.fileName(), attachment.contentType(), attachment.sizeBytes());
    }

    private static List<SubmissionViews.FileInput> toFileInputs(List<SubmissionFileRequest> files) {
        if (files == null) {
            return List.of();
        }
        return files.stream()
                .map(f -> new SubmissionViews.FileInput(f.url(), f.fileName(), f.contentType(), f.sizeBytes()))
                .toList();
    }
}
