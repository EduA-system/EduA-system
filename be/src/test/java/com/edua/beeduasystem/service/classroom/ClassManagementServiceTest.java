package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.ClassAccessRevokedException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.Subject;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.classroom.ClassMember;
import com.edua.beeduasystem.domain.model.classroom.ClassStatus;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.ClassResourceRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.SubmissionRepository;
import com.edua.beeduasystem.repository.repositories.TeacherGradeRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClassManagementServiceTest {

    private ClassRepository classRepository;
    private ClassMemberRepository classMemberRepository;
    private ClassResourceRepository classResourceRepository;
    private SubmissionRepository submissionRepository;
    private AppUserRepository userRepository;
    private TeacherGradeRepository teacherGradeRepository;
    private CurrentUserProvider currentUserProvider;
    private NotificationRepository notificationRepository;
    private NotificationStreamPort notificationStreamPort;
    private ClassManagementService service;

    @BeforeEach
    void setUp() {
        classRepository = mock(ClassRepository.class);
        classMemberRepository = mock(ClassMemberRepository.class);
        classResourceRepository = mock(ClassResourceRepository.class);
        submissionRepository = mock(SubmissionRepository.class);
        userRepository = mock(AppUserRepository.class);
        teacherGradeRepository = mock(TeacherGradeRepository.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        notificationRepository = mock(NotificationRepository.class);
        notificationStreamPort = mock(NotificationStreamPort.class);
        service = new ClassManagementService(classRepository, classMemberRepository, classResourceRepository,
                submissionRepository, userRepository, teacherGradeRepository, currentUserProvider,
                notificationRepository, notificationStreamPort);
    }

    @Test
    void createClass_setsOwnerAndActivatesClass() {
        UUID ownerId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(currentUserProvider.require()).thenReturn(claims(ownerId, Subject.CHEMISTRY));
        when(classRepository.save(any(Classroom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "teacher@edua.vn", "Teacher A")));
        // Giáo viên chỉ được tạo lớp thuộc khối mình phụ trách.
        when(teacherGradeRepository.findGradesByUserIds(List.of(ownerId))).thenReturn(Map.of(ownerId, List.of(10)));

        ClassViews.ClassDetail result = service.createClass(" 10A1 - Chemistry ", Subject.CHEMISTRY, 10, "  Lop hoc  ");

        ArgumentCaptor<Classroom> saved = ArgumentCaptor.forClass(Classroom.class);
        verify(classRepository).save(saved.capture());
        Classroom classroom = saved.getValue();
        assertThat(classroom.ownerId()).isEqualTo(ownerId);
        assertThat(classroom.status()).isEqualTo(ClassStatus.ACTIVE);
        assertThat(classroom.name()).isEqualTo("10A1 - Chemistry");
        assertThat(classroom.description()).isEqualTo("Lop hoc");
        assertThat(result.ownerName()).isEqualTo("Teacher A");
        assertThat(result.memberCount()).isEqualTo(1L);
    }

    @Test
    void createClass_rejectsSubjectOutsideOwnerSpecialty() {
        UUID ownerId = UUID.randomUUID();
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(currentUserProvider.require()).thenReturn(claims(ownerId, Subject.CHEMISTRY));

        assertThatThrownBy(() -> service.createClass("10A1", Subject.PHYSICS, 10, null))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessage("Bạn chỉ được tạo hoặc chỉnh sửa lớp thuộc chuyên ngành của mình.");

        verify(classRepository, org.mockito.Mockito.never()).save(any(Classroom.class));
    }

    @Test
    void updateClass_rejectsSubjectOutsideOwnerSpecialty() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.CHEMISTRY, 10, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(currentUserProvider.require()).thenReturn(claims(ownerId, Subject.CHEMISTRY));
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));

        assertThatThrownBy(() -> service.updateClass(classId, null, Subject.MATH, null, null))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessage("Bạn chỉ được tạo hoặc chỉnh sửa lớp thuộc chuyên ngành của mình.");

        verify(classRepository, org.mockito.Mockito.never()).save(any(Classroom.class));
    }

    @Test
    void listOwnedClasses_mapsCountsAndKeepsOwnershipScope() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", "Desc", Subject.MATH, 10, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.searchOwned(ownerId, Subject.MATH, 10, ClassStatus.ACTIVE, "10A", 0, 20))
                .thenReturn(new ClassRepository.SearchResult(List.of(classroom), 1));
        when(classMemberRepository.countByClassId(classId)).thenReturn(2L);

        ClassViews.Page<ClassViews.ClassSummary> result =
                service.listOwnedClasses(Subject.MATH, 10, ClassStatus.ACTIVE, "10A", 0, 20);

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().getFirst().memberCount()).isEqualTo(3L);
        assertThat(result.total()).isEqualTo(1L);
    }

    @Test
    void getDetail_allowsOwnerOrEnrolledStudent() {
        UUID ownerId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.PHYSICS, 11, ClassStatus.INACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(studentId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classMemberRepository.existsByClassIdAndStudentId(classId, studentId)).thenReturn(true);
        when(classMemberRepository.countByClassId(classId)).thenReturn(1L);
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner@edua.vn", "Owner Name")));

        ClassViews.ClassDetail detail = service.getDetail(classId);

        assertThat(detail.ownerName()).isEqualTo("Owner Name");
        assertThat(detail.status()).isEqualTo(ClassStatus.INACTIVE);
        assertThat(detail.memberCount()).isEqualTo(2L);
    }

    @Test
    void getDetail_rejectsStranger() {
        UUID ownerId = UUID.randomUUID();
        UUID strangerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.PHYSICS, 11, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(strangerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classMemberRepository.existsByClassIdAndStudentId(classId, strangerId)).thenReturn(false);

        assertThatThrownBy(() -> service.getDetail(classId))
                .isInstanceOf(ClassAccessRevokedException.class);
    }

    @Test
    void updateClass_rejectsInactiveClass() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.MATH, 10, ClassStatus.INACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));

        assertThatThrownBy(() -> service.updateClass(classId, "New name", null, null, null))
                .isInstanceOf(ForbiddenOperationException.class);
    }

    @Test
    void updateClass_notifiesEnrolledStudentsAboutChangedFields() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        UUID studentId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", "Desc", Subject.CHEMISTRY, 10, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classRepository.save(any(Classroom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner@edua.vn", "Owner Name")));
        when(teacherGradeRepository.findGradesByUserIds(List.of(ownerId))).thenReturn(Map.of(ownerId, List.of(10)));
        when(classMemberRepository.findAllStudentIds(classId)).thenReturn(List.of(studentId));
        when(notificationRepository.createWithRecipients(any(Notification.class), any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        service.updateClass(classId, "10A2", null, null, "Mo ta moi");

        ArgumentCaptor<Notification> notification = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).createWithRecipients(notification.capture(), org.mockito.ArgumentMatchers.eq(List.of(studentId)));
        assertThat(notification.getValue().title()).isEqualTo("Lớp 10A2 đã được cập nhật");
        assertThat(notification.getValue().content()).contains("tên lớp", "mô tả").doesNotContain("khối", "môn học");
        assertThat(notification.getValue().targetType()).isEqualTo("CLASS");
        assertThat(notification.getValue().targetUrl()).isEqualTo("/class-detail?classId=" + classId);
        verify(notificationStreamPort).publishNew(org.mockito.ArgumentMatchers.eq(studentId), any(NotificationEvent.class));
    }

    @Test
    void updateClass_skipsNotificationWhenNothingChanged() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", "Desc", Subject.CHEMISTRY, 10, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classRepository.save(any(Classroom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner@edua.vn", "Owner Name")));
        when(teacherGradeRepository.findGradesByUserIds(List.of(ownerId))).thenReturn(Map.of(ownerId, List.of(10)));

        service.updateClass(classId, "10A1", null, null, "Desc");

        verify(notificationRepository, org.mockito.Mockito.never()).createWithRecipients(any(Notification.class), any());
        verify(notificationStreamPort, org.mockito.Mockito.never()).publishNew(any(UUID.class), any(NotificationEvent.class));
    }

    @Test
    void updateStatus_switchesStatusForOwner() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.CHEMISTRY, 10, ClassStatus.ACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classRepository.save(any(Classroom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner@edua.vn", "Owner Name")));

        ClassViews.ClassDetail result = service.updateStatus(classId, ClassStatus.INACTIVE);

        ArgumentCaptor<Classroom> saved = ArgumentCaptor.forClass(Classroom.class);
        verify(classRepository).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo(ClassStatus.INACTIVE);
        assertThat(result.status()).isEqualTo(ClassStatus.INACTIVE);
    }

    @Test
    void updateStatus_activatingRequiresOwnGrade() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.CHEMISTRY, 10, ClassStatus.INACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        // Mod da doi khoi giao vien sang 11, khong con phu trach khoi 10 cua lop nay.
        when(teacherGradeRepository.findGradesByUserIds(List.of(ownerId))).thenReturn(Map.of(ownerId, List.of(11)));

        assertThatThrownBy(() -> service.updateStatus(classId, ClassStatus.ACTIVE))
                .isInstanceOf(ForbiddenOperationException.class)
                .hasMessage("Bạn chỉ được tạo hoặc chỉnh sửa lớp thuộc khối mình phụ trách.");

        verify(classRepository, org.mockito.Mockito.never()).save(any(Classroom.class));
    }

    @Test
    void updateStatus_activatingSucceedsWhenGradeStillAssigned() {
        UUID ownerId = UUID.randomUUID();
        UUID classId = UUID.randomUUID();
        Classroom classroom = classroom(classId, ownerId, "10A1", null, Subject.CHEMISTRY, 10, ClassStatus.INACTIVE);
        when(currentUserProvider.requireUserId()).thenReturn(ownerId);
        when(classRepository.findById(classId)).thenReturn(Optional.of(classroom));
        when(classRepository.save(any(Classroom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(ownerId)).thenReturn(Optional.of(user(ownerId, "owner@edua.vn", "Owner Name")));
        when(teacherGradeRepository.findGradesByUserIds(List.of(ownerId))).thenReturn(Map.of(ownerId, List.of(10)));

        ClassViews.ClassDetail result = service.updateStatus(classId, ClassStatus.ACTIVE);

        assertThat(result.status()).isEqualTo(ClassStatus.ACTIVE);
    }

    private static Classroom classroom(UUID id, UUID ownerId, String name, String description,
                                        Subject subject, Integer grade, ClassStatus status) {
        Instant now = Instant.parse("2026-07-25T00:00:00Z");
        return new Classroom(id, ownerId, name, description, subject, grade, status, now, now);
    }

    private static AppUser user(UUID id, String email, String fullName) {
        return new AppUser(id, email, null, fullName, null, null, null, null, null, UserStatus.ACTIVE, Instant.now(), null, null);
    }

    private static AccessTokenClaims claims(UUID userId, Subject subject) {
        return new AccessTokenClaims(userId, "teacher@edua.vn", Set.of(Role.TEACHER), subject);
    }
}
