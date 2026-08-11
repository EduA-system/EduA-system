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
                "principal@fpt.edu.vn",
                "sub-1",
                "Principal",
                "https://cdn.example.com/avatar.png",
                "0900000000",
                "Bio",
                "0987654321",
                Subject.CHEMISTRY,
                UserStatus.ACTIVE,
                Instant.now(),
                Instant.now(),
                null);

        UserDto dto = UserDto.from(user, Set.of(Role.TEACHER, Role.MODERATOR, Role.PRINCIPAL));

        assertThat(dto.role()).isEqualTo("PRINCIPAL");
        assertThat(dto.roles()).containsExactly("PRINCIPAL", "MODERATOR", "TEACHER");
        assertThat(dto.avatarUrl()).isEqualTo("https://cdn.example.com/avatar.png");
        assertThat(dto.contactInfo()).isEqualTo("0900000000");
        assertThat(dto.bio()).isEqualTo("Bio");
        assertThat(dto.phoneNumber()).isEqualTo("0987654321");
    }
}
