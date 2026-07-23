package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import java.util.UUID;

public record ItStaffDto(UUID id, String email, String fullName, String status) {
    public static ItStaffDto from(AppUser user) { return new ItStaffDto(user.id(), user.email(), user.fullName(), user.status().name()); }
}
