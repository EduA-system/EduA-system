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
import com.edua.beeduasystem.service.activitylog.ActivityLogService;
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
    private ActivityLogService activityLogService;
    private PrincipalModeratorService service;

    @BeforeEach
    void setUp() {
        userRepository = mock(AppUserRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        activityLogService = mock(ActivityLogService.class);
        service = new PrincipalModeratorService(userRepository, userRoleRepository, currentUserProvider, activityLogService);
    }

    @Test
    void utcLm01_emptyModeratorPageReturnsEmptyMetadata() {
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
    void utcLm02_noRecordedGranterIdsDoesNotResolveNames() {
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
    void utcLm03_returnsModeratorPageWithGrantMetadata() {
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
    void utcAdd01_createsNewModeratorWithNormalInput() {
        stubNewModerator("vuhiep@gmail.com");

        AppUser result = service.addModerator("vuhiep@gmail.com", "MATH", "Vũ Hiệp");

        assertThat(result.email()).isEqualTo("vuhiep@gmail.com");
        assertThat(result.fullName()).isEqualTo("Vũ Hiệp");
        assertThat(result.subject()).isEqualTo(Subject.MATH);
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(result.id()), eq(Role.MODERATOR), any(), any());
    }

    @Test
    void utcAdd02_normalizesNewModeratorFieldsAndAssignsRole() {
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
    void utcAdd03_acceptsNullFullName() {
        stubNewModerator("vuhiep@gmail.com");

        AppUser result = service.addModerator("vuhiep@gmail.com", "MATH", null);

        assertThat(result.fullName()).isNull();
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
    }

    @Test
    void utcAdd04_rejectsWhenSubjectAlreadyHasModerator() {
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(true);

        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "MATH", "Moderator"))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAdd05_rejectsDuplicateNonDisabledEmail() {
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(false);
        when(userRepository.findByEmail("moderator@edua.vn"))
                .thenReturn(Optional.of(user("moderator@edua.vn", "Existing", Subject.MATH, UserStatus.ACTIVE)));

        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "MATH", "Moderator"))
                .isInstanceOf(DuplicateEmailException.class);
    }

    @Test
    void utcAdd06_reactivatesDisabledExistingModeratorAccount() {
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
    void utcAdd07_rejectsInvalidSubject() {
        assertThatThrownBy(() -> service.addModerator("moderator@edua.vn", "HISTORY", "Moderator"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void utcAdd08_blankFullNameIsTrimmedToEmptyString() {
        stubNewModerator("vuhiep.blankname@gmail.com");

        AppUser result = service.addModerator(
                "vuhiep.blankname@gmail.com", "MATH", "   ");

        assertThat(result.fullName()).isEmpty();
    }

    @Test
    void utcAdd09_blankSubjectIsRejected() {
        assertThatThrownBy(() -> service.addModerator("vuhiep@gmail.com", "   ", null))
                .isInstanceOf(IllegalArgumentException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAdd10_emailAt320CharactersIsAccepted() {
        String email = "e".repeat(308) + "@example.com";
        stubNewModerator(email);

        AppUser result = service.addModerator(email, "MATH", "Vũ Hiệp");

        assertThat(result.email()).isEqualTo(email);
        assertThat(result.email()).hasSize(320);
    }

    @Test
    void utcAdd11_emailOver320CharactersIsRejected() {
        String email = "e".repeat(309) + "@example.com";

        assertThatThrownBy(() -> service.addModerator(email, "MATH", "Vũ Hiệp"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email must not exceed 320 characters.");

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcAdd12_fullNameAt255CharactersIsAccepted() {
        String fullName = "n".repeat(255);
        stubNewModerator("vuhiep.fullname@edua.vn");

        AppUser result = service.addModerator(
                "vuhiep.fullname@edua.vn", "MATH", fullName);

        assertThat(result.fullName()).isEqualTo(fullName);
        assertThat(result.fullName()).hasSize(255);
    }

    @Test
    void utcAdd13_fullNameOver255CharactersIsRejected() {
        assertThatThrownBy(() -> service.addModerator(
                "vuhiep.fullname@edua.vn", "MATH", "n".repeat(256)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Full name must not exceed 255 characters.");

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcRep03_reactivatesDisabledExistingReplacement() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        AppUser replacement = user(
                "bachnguyentuan@edua.vn", "Bách Nguyễn Tuấn", Subject.MATH, UserStatus.DISABLED);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));
        when(userRepository.findByEmail(replacement.email())).thenReturn(Optional.of(replacement));
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.replaceModerator(previous.id(), replacement.email(), false);

        assertThat(result.id()).isEqualTo(replacement.id());
        assertThat(result.status()).isEqualTo(UserStatus.INVITED);
        verify(userRoleRepository).replaceRole(eq(replacement.id()), eq(Role.MODERATOR), any(), any());
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
    void utcRep07_rejectsMissingCurrentModerator() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.replaceModerator(id, "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRep08_rejectsDisabledCurrentModerator() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.DISABLED);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRep09_rejectsCurrentUserWithoutModeratorRole() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.TEACHER));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), "new@edua.vn", false))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void utcRep10_rejectsReplacementThatIsAlreadyActiveModerator() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        AppUser replacement = user(
                "active.moderator@edua.vn", "Active Moderator", Subject.MATH, UserStatus.ACTIVE);
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));
        when(userRepository.findByEmail(replacement.email())).thenReturn(Optional.of(replacement));
        when(userRoleRepository.findRolesByUserId(replacement.id())).thenReturn(Set.of(Role.MODERATOR));
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), replacement.email(), false))
                .isInstanceOf(ForbiddenOperationException.class);

        verify(userRepository, never()).save(any());
    }

    @Test
    void utcRep11_replacementEmailAt320CharactersIsAccepted() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        String email = "e".repeat(308) + "@example.com";
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppUser result = service.replaceModerator(previous.id(), email, false);

        assertThat(result.email()).isEqualTo(email);
        assertThat(result.email()).hasSize(320);
    }

    @Test
    void utcRep12_replacementEmailOver320CharactersIsRejected() {
        AppUser previous = user("old@edua.vn", "Old", Subject.MATH, UserStatus.ACTIVE);
        String email = "e".repeat(309) + "@example.com";
        when(userRepository.findById(previous.id())).thenReturn(Optional.of(previous));
        when(userRoleRepository.findRolesByUserId(previous.id())).thenReturn(Set.of(Role.MODERATOR));

        assertThatThrownBy(() -> service.replaceModerator(previous.id(), email, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Email must not exceed 320 characters.");

        verify(userRepository, never()).save(any());
    }

    private void stubNewModerator(String email) {
        when(currentUserProvider.requireUserId()).thenReturn(UUID.randomUUID());
        when(userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, Subject.MATH)).thenReturn(false);
        when(userRepository.findByEmail(email)).thenReturn(Optional.empty());
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private AppUser user(String email, String fullName, Subject subject, UserStatus status) {
        return new AppUser(UUID.randomUUID(), email, null, fullName, null, null,
                subject, status, Instant.now(), null);
    }
}
