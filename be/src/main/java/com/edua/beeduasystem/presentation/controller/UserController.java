package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.presentation.dto.auth.UpdateProfileRequest;
import com.edua.beeduasystem.presentation.dto.auth.UserDto;
import com.edua.beeduasystem.presentation.dto.auth.UserProfileViewDto;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
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

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Thông tin hồ sơ người dùng hiện tại và hồ sơ read-only của người khác")
public class UserController {

    private final ProfileService profileService;
    private final UserProfileViewService profileViewService;
    private final TeacherGradeRepository teacherGradeRepository;

    public UserController(ProfileService profileService,
                          UserProfileViewService profileViewService,
                          TeacherGradeRepository teacherGradeRepository) {
        this.profileService = profileService;
        this.profileViewService = profileViewService;
        this.teacherGradeRepository = teacherGradeRepository;
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
        List<Integer> grades = (result.roles().contains(Role.TEACHER) || result.roles().contains(Role.MODERATOR))
                ? teacherGradeRepository.findGradesByUserIds(List.of(result.user().id())).getOrDefault(result.user().id(), List.of())
                : List.of();
        return UserDto.from(result.user(), result.roles(), grades);
    }

    @GetMapping("/{id}/profile")
    @PreAuthorize("hasAnyRole('MODERATOR', 'TEACHER', 'PRINCIPAL', 'STUDENT')")
    @Operation(
            summary = "Xem hồ sơ read-only của người khác",
            description = "Theo quan hệ được cấp quyền: Moderator xem Teacher cùng môn, Teacher xem "
                    + "Student trong lớp mình quản lý, Principal xem Moderator/IT Staff. Học sinh không được xem hồ sơ người khác. "
                    + "không xem được tài khoản đã bị thu hồi."
    )
    public UserProfileViewDto viewProfile(@PathVariable UUID id) {
        return profileViewService.view(id);
    }
}
