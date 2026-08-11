package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.auth.AddModeratorRequest;
import com.edua.beeduasystem.presentation.dto.auth.AddItStaffRequest;
import com.edua.beeduasystem.presentation.dto.auth.ItStaffDto;
import com.edua.beeduasystem.presentation.dto.auth.ModeratorDto;
import com.edua.beeduasystem.presentation.dto.auth.ReplaceItStaffRequest;
import com.edua.beeduasystem.presentation.dto.auth.ReplaceModeratorRequest;
import com.edua.beeduasystem.service.auth.PrincipalModeratorService;
import com.edua.beeduasystem.service.auth.PrincipalItStaffService;
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
@RequestMapping("/api/principal")
@Tag(name = "Principal", description = "Quản lý tài khoản Moderator bởi Principal (UC-60/61/62)")
@PreAuthorize("hasRole('PRINCIPAL')")
public class PrincipalController {

    private final PrincipalModeratorService principalModeratorService;
    private final PrincipalItStaffService principalItStaffService;

    public PrincipalController(PrincipalModeratorService principalModeratorService, PrincipalItStaffService principalItStaffService) {
        this.principalModeratorService = principalModeratorService;
        this.principalItStaffService = principalItStaffService;
    }

    @GetMapping("/moderators")
    @Operation(summary = "Danh sách Moderator (UC-60)",
            description = "Phân trang, sắp xếp theo created_at giảm dần.")
    public Page<ModeratorDto> listModerators(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var result = principalModeratorService.listModerators(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        return result.moderators().map(u -> {
            UUID granterId = result.granterUserIds().get(u.id());
            String granterName = granterId != null ? result.grantedByNames().get(granterId) : null;
            return ModeratorDto.from(u, result.grantedAts().get(u.id()), granterName);
        });
    }

    @PostMapping("/moderators")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Thêm Moderator (UC-61)",
            description = "Cấp quyền bằng email + subject. Email phải chưa tồn tại trong hệ thống.")
    public ModeratorDto addModerator(@Valid @RequestBody AddModeratorRequest request) {
        var user = principalModeratorService.addModerator(request.email(), request.subject(), request.fullName());
        return ModeratorDto.from(user, null, null);
    }

    @DeleteMapping("/moderators/{id}")
    @Operation(summary = "Thu hồi Moderator (không còn hỗ trợ)",
            description = "Moderator phải được thay thế qua endpoint replacement trước khi thu hồi quyền.")
    public void deleteModerator(@PathVariable UUID id) {
        principalModeratorService.deleteModerator(id);
    }

    @PostMapping("/moderators/{id}/replacement")
    @Operation(summary = "Thay Moderator",
            description = "Cấp Moderator kế nhiệm cùng môn, hạ Moderator cũ xuống Teacher và có thể vô hiệu hoá tài khoản cũ.")
    public ModeratorDto replaceModerator(
            @PathVariable UUID id,
            @Valid @RequestBody ReplaceModeratorRequest request) {
        var user = principalModeratorService.replaceModerator(id, request.replacementEmail(), request.disablePrevious());
        return ModeratorDto.from(user, null, null);
    }

    @PatchMapping("/moderators/{id}/reactivate")
    @ResponseStatus(HttpStatus.OK)
    @Operation(summary = "Kích hoạt lại Moderator đã bị thu hồi",
            description = "Set status = INVITED, cập nhật granted_by/granted_at.")
    public ModeratorDto reactivateModerator(@PathVariable UUID id) {
        var user = principalModeratorService.reactivateModerator(id);
        return ModeratorDto.from(user, null, null);
    }

    @GetMapping("/it-staff")
    public Page<ItStaffDto> listItStaffs(@RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        return principalItStaffService.list(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(ItStaffDto::from);
    }

    @PostMapping("/it-staff")
    @ResponseStatus(HttpStatus.CREATED)
    public ItStaffDto addItStaff(@Valid @RequestBody AddItStaffRequest request) {
        return ItStaffDto.from(principalItStaffService.add(request.email(), request.fullName()));
    }

    @DeleteMapping("/it-staff/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disableItStaff(@PathVariable UUID id) { principalItStaffService.disable(id); }

    @PostMapping("/it-staff/{id}/replacement")
    public ItStaffDto replaceItStaff(
            @PathVariable UUID id,
            @Valid @RequestBody ReplaceItStaffRequest request) {
        return ItStaffDto.from(principalItStaffService.replace(id, request.replacementEmail(), request.fullName()));
    }

    @PatchMapping("/it-staff/{id}/reactivate")
    public ItStaffDto reactivateItStaff(@PathVariable UUID id) {
        return ItStaffDto.from(principalItStaffService.reactivate(id));
    }
}
