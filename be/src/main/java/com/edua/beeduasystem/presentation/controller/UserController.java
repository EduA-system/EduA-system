package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.auth.UpdateProfileRequest;
import com.edua.beeduasystem.presentation.dto.auth.UserDto;
import com.edua.beeduasystem.service.auth.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Thông tin hồ sơ người dùng hiện tại")
public class UserController {

    private final ProfileService profileService;

    public UserController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PatchMapping("/me")
    @Operation(
            summary = "Cập nhật hồ sơ cá nhân",
            description = "Cập nhật tên hiển thị, URL ảnh đại diện, số điện thoại, giới thiệu ngắn và thông tin liên hệ của user đang đăng nhập. Gửi avatarUrl rỗng để gỡ ảnh đại diện khỏi hồ sơ."
    )
    public UserDto updateMe(@Valid @RequestBody UpdateProfileRequest request) {
        var result = profileService.updateCurrentUserProfile(
                request.fullName(),
                request.avatarUrl(),
                request.contactInfo(),
                request.bio(),
                request.phoneNumber());
        return UserDto.from(result.user(), result.roles());
    }
}
