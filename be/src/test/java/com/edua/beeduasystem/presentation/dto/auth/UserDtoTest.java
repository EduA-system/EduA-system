package com.edua.beeduasystem.presentation.dto.auth;

import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UserDtoTest {

    @Test
    void from_multipleRoles_ordersRolesByPriority() {
        AppUser user = new AppUser(
                UUID.randomUUID(),
                "admin@fpt.edu.vn",
                "sub-1",
                "Admin",
                Subject.CHEMISTRY,
                UserStatus.ACTIVE,
                Instant.now(),
                Instant.now());

        UserDto dto = UserDto.from(user, Set.of(Role.TEACHER, Role.MODERATOR, Role.ADMINISTRATOR));

        assertThat(dto.role()).isEqualTo("ADMINISTRATOR");
        assertThat(dto.roles()).containsExactly("ADMINISTRATOR", "MODERATOR", "TEACHER");
    }
}
