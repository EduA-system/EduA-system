package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.presentation.dto.classroom.AddStudentRequest;
import com.edua.beeduasystem.presentation.dto.classroom.ClassDetailDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassMemberDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassMemberPageDto;
import com.edua.beeduasystem.presentation.dto.classroom.ClassPageDto;
import com.edua.beeduasystem.presentation.dto.classroom.CreateClassRequest;
import com.edua.beeduasystem.presentation.dto.classroom.ImportStudentsResponse;
import com.edua.beeduasystem.presentation.dto.classroom.UpdateClassRequest;
import com.edua.beeduasystem.presentation.dto.classroom.UpdateClassStatusRequest;
import com.edua.beeduasystem.service.classroom.ClassEnrollmentService;
import com.edua.beeduasystem.service.classroom.ClassManagementService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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

import java.util.UUID;

@RestController
@RequestMapping("/api/classes")
@Tag(name = "Class Management", description = "Teacher quan ly lop hoc theo Class Hub (UC-29/30/31/32/33) va them hoc sinh (UC-36)")
public class ClassController {

    private final ClassManagementService classManagementService;
    private final ClassEnrollmentService classEnrollmentService;

    public ClassController(ClassManagementService classManagementService,
                           ClassEnrollmentService classEnrollmentService) {
        this.classManagementService = classManagementService;
        this.classEnrollmentService = classEnrollmentService;
    }

    @GetMapping
    @PreAuthorize("hasRole('TEACHER')")
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('TEACHER')")
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
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Cập nhật thông tin lớp (UC-31)")
    public ClassDetailDto update(@PathVariable UUID id, @Valid @RequestBody UpdateClassRequest request) {
        return ClassDetailDto.from(classManagementService.updateClass(
                id, request.name(), request.subject(), request.grade(), request.description()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('TEACHER')")
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
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Thêm 1 học sinh bằng Gmail (UC-36 Normal Flow)")
    public ClassMemberDto addStudent(@PathVariable UUID id, @Valid @RequestBody AddStudentRequest request) {
        return ClassMemberDto.from(classEnrollmentService.addStudent(id, request.email()));
    }

    @PostMapping("/{id}/members/import")
    @PreAuthorize("hasRole('TEACHER')")
    @Operation(summary = "Import học sinh từ file .csv/.xlsx, cột bắt buộc \"gmail\" (UC-36 Alt Flow)")
    public ImportStudentsResponse importMembers(@PathVariable UUID id, @RequestPart("file") MultipartFile file) {
        return ImportStudentsResponse.from(classEnrollmentService.importStudents(id, file));
    }
}
