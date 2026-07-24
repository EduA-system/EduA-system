package com.edua.beeduasystem.service.auth;

import com.edua.beeduasystem.domain.exception.DuplicateEmailException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PrincipalModeratorServiceWorkbookTest {

    private AppUserRepository userRepository;
    private UserRoleRepository userRoleRepository;
    private CurrentUserProvider currentUserProvider;
    private PrincipalModeratorService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        service = new PrincipalModeratorService(userRepository, userRoleRepository, currentUserProvider);
    }

    @Test
    void utcLm01_returnsModeratorPageWithGrantMetadata() {
        AppUser moderator = user("mod@edua.vn", "Moderator", Subject.MATH, UserStatus.ACTIVE);
        AppUser principal = user("principal@edua.vn", "Principal Name", null, UserStatus.ACTIVE);
        Instant grantedAt = Instant.now();
        when(userRepository.findAllByRole(eq(Role.MODERATOR), any()))
                .thenReturn(new PageImpl<>(List.of(moderator), PageRequest.of(0, 10), 1));
        when(userRoleRepository.findGrantedByUserIdsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of(moderator.id(), principal.id()));
        when(userRoleRepository.findGrantedAtsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of(moderator.id(), grantedAt));
        when(userRepository.findAllById(Set.of(principal.id()))).thenReturn(List.of(principal));

        PrincipalModeratorService.ModeratorListResult result = service.listModerators(PageRequest.of(0, 10));

        assertThat(result.moderators().getContent()).containsExactly(moderator);
        assertThat(result.granterUserIds()).containsEntry(moderator.id(), principal.id());
        assertThat(result.grantedAts()).containsEntry(moderator.id(), grantedAt);
        assertThat(result.grantedByNames()).containsEntry(principal.id(), "Principal Name");
    }

    @Test
    void utcLm02_emptyModeratorPageReturnsEmptyMetadata() {
        when(userRepository.findAllByRole(eq(Role.MODERATOR), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        PrincipalModeratorService.ModeratorListResult result = service.listModerators(PageRequest.of(0, 10));

        assertThat(result.moderators().getContent()).isEmpty();
        assertThat(result.grantedByNames()).isEmpty();
        assertThat(result.granterUserIds()).isEmpty();
        assertThat(result.grantedAts()).isEmpty();
        verifyNoInteractions(userRoleRepository);
    }

    @Test
    void utcLm03_noRecordedGranterIdsDoesNotResolveNames() {
        AppUser moderator = user("mod@edua.vn", "Moderator", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findAllByRole(eq(Role.MODERATOR), any()))
                .thenReturn(new PageImpl<>(List.of(moderator), PageRequest.of(0, 10), 1));
        when(userRoleRepository.findGrantedByUserIdsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of());
        when(userRoleRepository.findGrantedAtsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of());

        PrincipalModeratorService.ModeratorListResult result = service.listModerators(PageRequest.of(0, 10));

        assertThat(result.grantedByNames()).isEmpty();
        assertThat(result.granterUserIds()).isEmpty();
    }

    @Test
    void utcLm04_granterDisplayNameFallsBackToEmailWhenFullNameMissing() {
        AppUser moderator = user("mod@edua.vn", "Moderator", Subject.MATH, UserStatus.ACTIVE);
        AppUser principal = user("principal@edua.vn", null, null, UserStatus.ACTIVE);
        when(userRepository.findAllByRole(eq(Role.MODERATOR), any()))
                .thenReturn(new PageImpl<>(List.of(moderator), PageRequest.of(0, 10), 1));
        when(userRoleRepository.findGrantedByUserIdsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of(moderator.id(), principal.id()));
        when(userRoleRepository.findGrantedAtsByUserIds(anyCollection(), eq(Role.MODERATOR)))
                .thenReturn(Map.of());
        when(userRepository.findAllById(Set.of(principal.id()))).thenReturn(List.of(principal));

        PrincipalModeratorService.ModeratorListResult result = service.listModerators(PageRequest.of(0, 10));

        assertThat(result.grantedByNames()).containsEntry(principal.id(), "principal@edua.vn");
    }

    @Test
    void utcAdd01_createsNewModeratorInviteAndAssignsRole() {
        UUID principalId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(principalId);
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(false);
        when(userRepository.findByEmail("moderator@edua.vn")).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.addModerator(" Moderator@EduA.VN ", " math ", " Moderator Name ");

        assertThat(result.email()).isEqualTo("moderator@edua.vn");
        assertThat(result.fullName()).isEqualTo("Moderator Name");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(result.id()), eq(Role.MODERATOR), eq(principalId), any());
    }

    @Test
    void utcAdd02_reactivatesDisabledExistingModeratorAccount() {
        UUID principalId = UUID.randomUUID();
        AppUser disabled = user("moderator@edua.vn", "Old Name", Subject.PHYSICS, UserStatus.DISABLED);
        when(currentUserProvider.requireUserId()).thenReturn(principalId);
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(false);
        when(userRepository.findByEmail("moderator@edua.vn")).thenReturn(Optional.of(disabled));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.addModerator("moderator@edua.vn", "MATH", "New Name");

        assertThat(result.id()).isEqualTo(disabled.id());
        assertThat(result.fullName()).isEqualTo("New Name");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(disabled.id()), eq(Role.MODERATOR), eq(principalId), any());
    }

    @Test
    void utcAdd03_rejectsWhenSubjectAlreadyHasModerator() {
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(true);

        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "MATH", "Moderator"))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAdd04_rejectsDuplicateNonDisabledEmail() {
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(false);
        when(userRepository.findByEmail("moderator@edua.vn"))
                .thenReturn(Optional.of(user("moderator@edua.vn", "Existing", Subject.MATH, UserStatus.ACTIVE)));

        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "MATH", "Moderator"))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void utcAdd05_rejectsInvalidSubject() {
        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "HISTORY", "Moderator"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void utcRep04_rejectsCurrentModeratorWithoutSubject() {
        AppUser previous = user("old@edua.vn", "Old", null, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), "new@edua.vn", false))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void utcRep05_rejectsSameReplacementEmail() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), " OLD@EduA.vn ", false))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void utcRep08_rejectsMissingCurrentModerator() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.replaceModerator(id, "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRep09_rejectsDisabledCurrentModerator() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.DISABLED);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRep10_rejectsCurrentUserWithoutModeratorRole() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.TEACHER));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status) {
        return new AppUser(UUID.randomUUID(), email, null, fullName, null, null,
                subject, status, Instant.now(), null);
    }
}
