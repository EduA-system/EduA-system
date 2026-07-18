package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import java.util.UUID;

public record ItManagerDto(UUID id, String email, String fullName, String status) {
    public static ItManagerDto from(AppUser user) { return new ItManagerDto(user.id(), user.email(), user.fullName(), user.status().name()); }
}
