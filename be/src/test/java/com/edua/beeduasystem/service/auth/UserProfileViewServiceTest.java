package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UserProfileViewServiceTest {

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private ClassRepository classRepository;
    private CurrentUserProvider currentUser;
    private UserProfileViewService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        classRepository = mock(ClassRepository.class);
        currentUser = mock(CurrentUserProvider.class);
        service = new UserProfileViewService(
                userRepository,
                userRoleRepository,
                mock(TeacherGradeRepository.class),
                classRepository,
                currentUser);
    }

    @Test
    void studentCannotViewAnotherStudentsProfile() {
        UUID viewerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(viewerId);
        when(userRepository.findById(targetId)).thenReturn(Optional.of(activeUser(targetId)));
        when(userRoleRepository.findRolesByUserId(viewerId)).thenReturn(Set.of(Role.STUDENT));
        when(userRoleRepository.findRolesByUserId(targetId)).thenReturn(Set.of(Role.STUDENT));

        assertThatThrownBy(() -> service.view(targetId))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessageContaining("không có quyền xem hồ sơ");

        verifyNoInteractions(classRepository);
    }

    @Test
    void moderatorCanViewStudentInClassTheyManage() {
        UUID moderatorId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        when(currentUser.requireUserId()).thenReturn(moderatorId);
        when(userRepository.findById(studentId)).thenReturn(Optional.of(activeUser(studentId)));
        when(userRoleRepository.findRolesByUserId(moderatorId)).thenReturn(Set.of(Role.MODERATOR));
        when(userRoleRepository.findRolesByUserId(studentId)).thenReturn(Set.of(Role.STUDENT));
        when(classRepository.searchEnrolled(studentId, null, null, null, null, 0, 100))
                .thenReturn(new ClassRepository.SearchResult(List.of(classroom(moderatorId)), 1));

        assertThat(service.view(studentId).id()).isEqualTo(studentId);
    }

    private static AppUser activeUser(UUID id) {
        return new AppUser(id, "student@edua.local", "google-sub", "Student", null,
                null, null, null, null, UserStatus.ACTIVE, Instant.now(), null, null);
    }

    private static Classroom classroom(UUID ownerId) {
        return new Classroom(UUID.randomUUID(), ownerId, "Lớp 10A", "Mô tả", Subject.MATH,
                10, ClassStatus.ACTIVE, Instant.now(), Instant.now());
    }
}
