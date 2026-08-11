package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.auth.UpdateProfileRequest;
import com.edua.beeduasystem.presentation.dto.auth.UserDto;
import com.edua.beeduasystem.presentation.dto.auth.UserProfileViewDto;
import com.edua.beeduasystem.service.auth.ProfileService;
import com.edua.beeduasystem.service.auth.UserProfileViewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Thông tin hồ sơ người dùng hiện tại và hồ sơ read-only của người khác")
public class UserController {

    private final ProfileService profileService;
    private final UserProfileViewService profileViewService;

    public UserController(ProfileService profileService, UserProfileViewService profileViewService) {
        this.profileService = profileService;
        this.profileViewService = profileViewService;
    }

    @PatchMapping("/me")
    @Operation(
            summary = "Cập nhật hồ sơ cá nhân",
            description = "Cập nhật tên hiển thị, URL ảnh đại diện, số điện thoại, ngày sinh, giới thiệu ngắn và thông tin liên hệ của user đang đăng nhập. Student không tự sửa ngày sinh. Gửi avatarUrl rỗng để gỡ ảnh đại diện khỏi hồ sơ."
    )
    public UserDto updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        var result = profileService.updateCurrentUserProfile(
                request.fullName(),
                request.avatarUrl(),
                request.contactInfo(),
                request.bio(),
                request.phoneNumber(),
                request.dateOfBirth());
        return UserDto.from(result.user(), result.roles());
    }

    @GetMapping("/{id}/profile")
    @PreAuthorize("hasAnyRole('MODERATOR', 'TEACHER', 'PRINCIPAL')")
    @Operation(
            summary = "Xem hồ sơ read-only của người khác",
            description = "Chỉ theo đúng quan hệ quản lý 1 chiều: Moderator xem Teacher cùng môn, Teacher xem "
                    + "Student trong lớp mình dạy, Principal xem Moderator/IT Staff. Không có chiều ngược, "
                    + "không xem được tài khoản đã bị thu hồi."
    )
    public UserProfileViewDto viewProfile(@PathVariable UUID id) {
        return profileViewService.view(id);
    }
}
