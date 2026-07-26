package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ModeratorTeacherServiceTest {

    private static final UUID MODERATOR_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private ModeratorTeacherService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new ModeratorTeacherService(userRepository, userRoleRepository, currentUserProvider);
        when(currentUserProvider.require()).thenReturn(
                new AccessTokenClaims(MODERATOR_ID, "moderator@edua.vn", Set.of(Role.MODERATOR), Subject.MATH));
        when(currentUserProvider.requireUserId()).thenReturn(MODERATOR_ID);
    }

    @Test
    void utcAt01_createsNewTeacherInviteForModeratorSubject() {
        stubNewTeacher("vutuanhiep.teacher@edua.vn");

        AppUser result = service.addTeacher(
                "vutuanhiep.teacher@edua.vn", "MATH", "Vũ Tuấn Hiệp");

        assertThat(result.email()).isEqualTo("vutuanhiep.teacher@edua.vn");
        assertThat(result.fullName()).isEqualTo("Vũ Tuấn Hiệp");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(result.id()), eq(Role.TEACHER), eq(MODERATOR_ID), any());
    }

    @Test
    void utcAt02_reactivatesDisabledTeacherAccount() {
        AppUser disabled = user("teacher@edua.vn", "Old Name", Subject.PHYSICS, UserStatus.DISABLED);
        when(userRepository.findByEmail("teacher@edua.vn")).thenReturn(Optional.of(disabled));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.addTeacher("teacher@edua.vn", "MATH", "Teacher Name");

        assertThat(result.id()).isEqualTo(disabled.id());
        assertThat(result.fullName()).isEqualTo("Teacher Name");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(disabled.id()), eq(Role.TEACHER), eq(MODERATOR_ID), any());
    }

    @Test
    void utcAt03_rejectsDuplicateNonDisabledEmail() {
        when(userRepository.findByEmail("teacher@edua.vn"))
                .thenReturn(Optional.of(user("teacher@edua.vn", "Existing", Subject.MATH, UserStatus.ACTIVE)));

        assertThatThrownBy(() -> service.addTeacher("teacher@edua.vn", "MATH", "Teacher"))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void utcAt04_rejectsDifferentSubjectFromModeratorSubject() {
        assertThatThrownBy(() -> service.addTeacher("teacher@edua.vn", "PHYSICS", "Teacher"))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("MATH");

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAt05_normalizesNewTeacherFields() {
        when(userRepository.findByEmail("teacher@edua.vn")).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.addTeacher(" Teacher@EduA.VN ", " math ", " Teacher Name ");

        assertThat(result.email()).isEqualTo("teacher@edua.vn");
        assertThat(result.fullName()).isEqualTo("Teacher Name");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(result.id()), eq(Role.TEACHER), eq(MODERATOR_ID), any());
    }

    @Test
    void utcAt06_blankSubjectIsRejected() {
        assertThatThrownBy(() -> service.addTeacher(
                "vutuanhiep.teacher@edua.vn", "   ", "Vũ Tuấn Hiệp"))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAt07_emailAt320CharactersIsAccepted() {
        String email = "e".repeat(308) + "@example.com";
        stubNewTeacher(email);

        AppUser result = service.addTeacher(email, "MATH", "Vũ Tuấn Hiệp");

        assertThat(result.email()).isEqualTo(email);
        assertThat(result.email()).hasSize(320);
    }

    @Test
    void utcAt08_emailOver320CharactersIsRejected() {
        String email = "e".repeat(309) + "@example.com";

        assertThatThrownBy(() -> service.addTeacher(email, "MATH", "Vũ Tuấn Hiệp"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email must not exceed 320 characters.");

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAt09_fullNameAt255CharactersIsAccepted() {
        String fullName = "n".repeat(255);
        stubNewTeacher("vutuanhiep.teacher@edua.vn");

        AppUser result = service.addTeacher(
                "vutuanhiep.teacher@edua.vn", "MATH", fullName);

        assertThat(result.fullName()).isEqualTo(fullName);
        assertThat(result.fullName()).hasSize(255);
    }

    @Test
    void utcAt10_fullNameOver255CharactersIsRejected() {
        assertThatThrownBy(() -> service.addTeacher(
                "vutuanhiep.teacher@edua.vn", "MATH", "n".repeat(256)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Full name must not exceed 255 characters.");

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcDt01_softDeletesTeacherInModeratorSubject() {
        AppUser teacher = user("teacher@edua.vn", "Teacher", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(teacher.id())).thenReturn(Optional.of(teacher));
        when(userRoleRepository.findRolesByUserId(teacher.id())).thenReturn(Set.of(Role.TEACHER));

        service.deleteTeacher(teacher.id());

        ArgumentCaptor<AppUser> saved = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().id()).isEqualTo(teacher.id());
        assertThat(saved.getValue().email()).isEqualTo(teacher.email());
        assertThat(saved.getValue().subject()).isEqualTo(Subject.MATH);
        assertThat(saved.getValue().status()).isEqualTo(UserStatus.DISABLED);
    }

    @Test
    void utcDt02_missingTeacherRejected() {
        UUID teacherId = UUID.randomUUID();
        when(userRepository.findById(teacherId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteTeacher(teacherId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcDt03_alreadyDisabledTeacherRejected() {
        AppUser teacher = user("teacher@edua.vn", "Teacher", Subject.MATH, UserStatus.DISABLED);
        when(userRepository.findById(teacher.id())).thenReturn(Optional.of(teacher));

        assertThatThrownBy(() -> service.deleteTeacher(teacher.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcDt04_userWithoutTeacherRoleRejected() {
        AppUser teacher = user("teacher@edua.vn", "Teacher", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(teacher.id())).thenReturn(Optional.of(teacher));
        when(userRoleRepository.findRolesByUserId(teacher.id())).thenReturn(Set.of(Role.MODERATOR));

        assertThatThrownBy(() -> service.deleteTeacher(teacher.id()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcDt05_moderatorWithoutSubjectCannotDeleteTeachers() {
        when(currentUserProvider.require()).thenReturn(
                new AccessTokenClaims(MODERATOR_ID, "moderator@edua.vn", Set.of(Role.MODERATOR), null));

        assertThatThrownBy(() -> service.deleteTeacher(UUID.randomUUID()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("subject");
    }

    @Test
    void utcDt06_differentSubjectTeacherRejected() {
        AppUser teacher = user("teacher@edua.vn", "Teacher", Subject.PHYSICS, UserStatus.ACTIVE);
        when(userRepository.findById(teacher.id())).thenReturn(Optional.of(teacher));
        when(userRoleRepository.findRolesByUserId(teacher.id())).thenReturn(Set.of(Role.TEACHER));

        assertThatThrownBy(() -> service.deleteTeacher(teacher.id()))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("MATH");
    }

    private void stubNewTeacher(String email) {
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status) {
        return new AppUser(UUID.randomUUID(), email, null, fullName, null, null,
                subject, status, Instant.now(), null);
    }
}
