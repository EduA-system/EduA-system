package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ModeratorTeacherServiceTest {
    private AppUserRepository users;
    private UserRoleRepository roles;
    private CurrentUserProvider current;
    private ModeratorTeacherService service;
    private final UUID moderatorId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        users = mock(AppUserRepository.class); roles = mock(UserRoleRepository.class); current = mock(CurrentUserProvider.class);
        service = new ModeratorTeacherService(users, roles, current);
    }

    @Test void listTeachers_rejectsModeratorWithoutSubject() {
        when(current.require()).thenReturn(new AccessTokenClaims(moderatorId, "m@e.vn", Set.of(Role.MODERATOR), null));
        assertThatThrownBy(() -> service.listTeachers(PageRequest.of(0, 10))).isInstanceOf(ForbiddenOperationException.class);
    }

    @Test void addTeacher_createsTeacherForModeratorSubject() {
        stubModerator(Subject.MATH); when(current.requireUserId()).thenReturn(moderatorId);
        when(users.findByEmail("t@e.vn")).thenReturn(Optional.empty()); when(users.save(any())).thenAnswer(i -> i.getArgument(0));
        AppUser result = service.addTeacher(" T@E.vn ", "math", "Teacher");
        assertThat(result.subject()).isEqualTo(Subject.MATH); assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(roles).replaceRole(eq(result.id()), eq(Role.TEACHER), eq(moderatorId), any());
    }

    @Test void deleteTeacher_disablesTeacherInSameSubject() {
        stubModerator(Subject.MATH); AppUser teacher = user(Subject.MATH, UserStatus.ACTIVE);
        when(users.findById(teacher.id())).thenReturn(Optional.of(teacher)); when(roles.findRolesByUserId(teacher.id())).thenReturn(Set.of(Role.TEACHER)); when(users.save(any())).thenAnswer(i -> i.getArgument(0));
        service.deleteTeacher(teacher.id());
        verify(users).save(org.mockito.ArgumentMatchers.argThat(u -> u.status() == UserStatus.DISABLED));
    }

    @Test void reactivateTeacher_restoresDisabledTeacher() {
        stubModerator(Subject.MATH); when(current.requireUserId()).thenReturn(moderatorId); AppUser teacher = user(Subject.MATH, UserStatus.DISABLED);
        when(users.findById(teacher.id())).thenReturn(Optional.of(teacher)); when(roles.findRolesByUserId(teacher.id())).thenReturn(Set.of(Role.TEACHER)); when(users.save(any())).thenAnswer(i -> i.getArgument(0));
        assertThat(service.reactivateTeacher(teacher.id()).status()).isEqualTo(UserStatus.INVITED);
    }

    private void stubModerator(Subject subject) { when(current.require()).thenReturn(new AccessTokenClaims(moderatorId, "m@e.vn", Set.of(Role.MODERATOR), subject)); }
    private AppUser user(Subject subject, UserStatus status) { return new AppUser(UUID.randomUUID(), "t@e.vn", null, null, null, null, subject, status, Instant.now(), null); }
}
