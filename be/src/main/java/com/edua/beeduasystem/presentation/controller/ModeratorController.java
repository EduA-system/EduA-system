package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.auth.AddTeacherRequest;
import com.edua.beeduasystem.presentation.dto.auth.TeacherDto;
import com.edua.beeduasystem.service.auth.ModeratorTeacherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/moderator")
@Tag(name = "Moderator", description = "Quản lý tài khoản Teacher bởi Moderator (UC-13/14/15)")
@PreAuthorize("hasRole('MODERATOR')")
public class ModeratorController {

    private final ModeratorTeacherService moderatorTeacherService;

    public ModeratorController(ModeratorTeacherService moderatorTeacherService) {
        this.moderatorTeacherService = moderatorTeacherService;
    }

    @GetMapping("/teachers")
    @Operation(summary = "Danh sách Teacher cùng subject (UC-13)",
            description = "Chỉ trả teacher có subject trùng với moderator hiện tại. Phân trang.")
    public Page<TeacherDto> listTeachers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = moderatorTeacherService.listTeachers(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return result.teachers().map(u -> {
            UUID granterId = result.granterUserIds().get(u.id());
            String granterName = granterId != null ? result.grantedByNames().get(granterId) : null;
            return TeacherDto.from(u, result.grantedAts().get(u.id()), granterName);
        });
    }

    @PostMapping("/teachers")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm Teacher (UC-14)",
            description = "Cấp quyền bằng email. Subject phải trùng với subject của moderator. Email chưa tồn tại.")
    public TeacherDto addTeacher(@Valid @RequestBody AddTeacherRequest request) {
        var user = moderatorTeacherService.addTeacher(request.email(), request.subject(), request.fullName());
        return TeacherDto.from(user, null, null);
    }

    @DeleteMapping("/teachers/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Thu hồi Teacher (UC-15)",
            description = "Soft-delete: set status = DISABLED. Chỉ được xoá teacher cùng subject.")
    public void deleteTeacher(@PathVariable UUID id) {
        moderatorTeacherService.deleteTeacher(id);
    }

    @PatchMapping("/teachers/{id}/reactivate")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Kích hoạt lại Teacher đã bị thu hồi",
            description = "Set status = INVITED, cập nhật granted_by/granted_at.")
    public TeacherDto reactivateTeacher(@PathVariable UUID id) {
        var user = moderatorTeacherService.reactivateTeacher(id);
        return TeacherDto.from(user, null, null);
    }
}
