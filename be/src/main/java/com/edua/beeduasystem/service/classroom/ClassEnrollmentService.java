package com.edua.beeduasystem.service.classroom;

import com.edua.beeduasystem.domain.exception.BulkEnrollmentFailedException;
import com.edua.beeduasystem.domain.exception.ClassEnrollmentConflictException;
import com.edua.beeduasystem.domain.exception.ForbiddenOperationException;
import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.auth.AppUser;
import com.edua.beeduasystem.domain.model.auth.Role;
import com.edua.beeduasystem.domain.model.auth.UserStatus;
import com.edua.beeduasystem.domain.model.classroom.ClassMember;
import com.edua.beeduasystem.domain.model.classroom.Classroom;
import com.edua.beeduasystem.domain.model.notification.Notification;
import com.edua.beeduasystem.repository.gateways.NotificationEvent;
import com.edua.beeduasystem.repository.gateways.NotificationStreamPort;
import com.edua.beeduasystem.repository.repositories.AppUserRepository;
import com.edua.beeduasystem.repository.repositories.ClassMemberRepository;
import com.edua.beeduasystem.repository.repositories.ClassRepository;
import com.edua.beeduasystem.repository.repositories.NotificationRepository;
import com.edua.beeduasystem.repository.repositories.UserRoleRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Use-case Add Student (UC-36, alias "Enroll Student"): Teacher them hoc sinh vao lop minh so huu
 * bang Gmail, thu cong 1 email hoac import file CSV/XLSX. Xem thiet ke: designs/API_designs/add-student.md.
 */
@Service
public class ClassEnrollmentService {

    private static final int MAX_CLASS_SIZE = 60;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("csv", "xlsx");
    private static final String REQUIRED_COLUMN = "gmail";
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ClassRepository classRepository;
    private final ClassMemberRepository classMemberRepository;
    private final AppUserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final NotificationRepository notificationRepository;
    private final NotificationStreamPort notificationStreamPort;

    public ClassEnrollmentService(ClassRepository classRepository,
                                  ClassMemberRepository classMemberRepository,
                                  AppUserRepository userRepository,
                                  UserRoleRepository userRoleRepository,
                                  CurrentUserProvider currentUserProvider,
                                  NotificationRepository notificationRepository,
                                  NotificationStreamPort notificationStreamPort) {
        this.classRepository = classRepository;
        this.classMemberRepository = classMemberRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.currentUserProvider = currentUserProvider;
        this.notificationRepository = notificationRepository;
        this.notificationStreamPort = notificationStreamPort;
    }

    @Transactional(readOnly = true)
    public ClassMemberViews.Page listMembers(UUID classId, int page, int size) {
        requireAccessibleClass(classId);
        ClassMemberRepository.PageResult result = classMemberRepository.findByClassId(classId, page, size);
        return new ClassMemberViews.Page(toMemberSummaries(result.items()), page, size, result.total());
    }

    @Transactional
    public ClassMemberViews.MemberSummary addStudent(UUID classId, String rawEmail) {
        Classroom classroom = requireOwnedActiveClass(classId);
        String email = requireEmail(rawEmail);
        requireCapacity(classroom.id());
        AppUser student = resolveOrCreateStudent(email);
        requireNotEnrolled(classroom.id(), student.id());
        ClassMember saved = classMemberRepository.save(new ClassMember(
                UUID.randomUUID(), classroom.id(), student.id(), Instant.now()));
        notifyEnrollment(classroom, List.of(student.id()));
        return toMemberSummary(saved, student);
    }

    @Transactional
    public ClassMemberViews.ImportResult importStudents(UUID classId, MultipartFile file) {
        Classroom classroom = requireOwnedActiveClass(classId);
        List<ParsedRow> rows = parseFile(file);

        Set<String> seenInFile = new HashSet<>();
        List<ClassMemberViews.SkippedRow> skipped = new ArrayList<>();
        List<UUID> notifyIds = new ArrayList<>();
        long baseCount = classMemberRepository.countByClassId(classroom.id());
        long addedSoFar = 0;

        for (ParsedRow row : rows) {
            String email = normalizeEmail(row.rawEmail());
            if (email == null || !isValidEmail(email)) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), row.rawEmail(), "INVALID_FORMAT"));
                continue;
            }
            if (!seenInFile.add(email)) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), email, "DUPLICATE_IN_FILE"));
                continue;
            }
            if (baseCount + addedSoFar >= MAX_CLASS_SIZE) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), email, "CLASS_FULL"));
                continue;
            }
            try {
                AppUser student = resolveOrCreateStudent(email);
                requireNotEnrolled(classroom.id(), student.id());
                classMemberRepository.save(new ClassMember(
                        UUID.randomUUID(), classroom.id(), student.id(), Instant.now()));
                notifyIds.add(student.id());
                addedSoFar++;
            } catch (ClassEnrollmentConflictException ex) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), email, ex.reason()));
            } catch (DataAccessException ex) {
                throw new BulkEnrollmentFailedException("Thao tac that bai. Vui long thu lai.", ex);
            }
        }

        notifyEnrollment(classroom, notifyIds);
        return new ClassMemberViews.ImportResult((int) addedSoFar, skipped.size(), List.copyOf(skipped));
    }

    // ---- resolve-or-create AppUser theo email (dung chung cho add 1 email va tung dong import) ----

    private AppUser resolveOrCreateStudent(String email) {
        UUID actorId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        Optional<AppUser> existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            AppUser created = userRepository.save(new AppUser(
                    UUID.randomUUID(), email, null, null, null, null,
                    null, UserStatus.INVITED, now, null));
            userRoleRepository.replaceRole(created.id(), Role.STUDENT, actorId, now);
            return created;
        }
        AppUser user = existing.get();
        if (user.status() == UserStatus.DISABLED) {
            throw new ClassEnrollmentConflictException(
                    "ACCOUNT_DISABLED", "Tai khoan da bi khoa, lien he quan tri vien.");
        }
        Set<Role> roles = userRoleRepository.findRolesByUserId(user.id());
        if (!roles.isEmpty() && !roles.contains(Role.STUDENT)) {
            throw new ClassEnrollmentConflictException(
                    "ROLE_CONFLICT", "Email nay da duoc cap cho vai tro khac.");
        }
        userRoleRepository.replaceRole(user.id(), Role.STUDENT, actorId, now);
        return user;
    }

    private void requireCapacity(UUID classId) {
        if (classMemberRepository.countByClassId(classId) >= MAX_CLASS_SIZE) {
            throw new ClassEnrollmentConflictException(
                    "CLASS_FULL", "Lop da dat so luong thanh vien toi da (" + MAX_CLASS_SIZE + ").");
        }
    }

    private void requireNotEnrolled(UUID classId, UUID studentId) {
        if (classMemberRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new ClassEnrollmentConflictException("ALREADY_ENROLLED", "Hoc sinh nay da co trong lop.");
        }
    }

    // ---- notification (BR-46) ----

    private void notifyEnrollment(Classroom classroom, List<UUID> studentIds) {
        if (studentIds.isEmpty()) {
            return;
        }
        UUID senderId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        String title = "Ban da duoc them vao lop " + classroom.name();
        String content = "Giao vien da them ban vao lop \"" + classroom.name() + "\". Dang nhap de xem chi tiet.";
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, classroom.subject(), title, content, now),
                studentIds);
        String senderName = resolveSenderName(senderId);
        NotificationEvent event = new NotificationEvent(
                saved.id(), saved.title(), saved.content(), saved.subject(), senderName, saved.createdAt());
        studentIds.forEach(id -> notificationStreamPort.publishNew(id, event));
    }

    private String resolveSenderName(UUID senderId) {
        return userRepository.findById(senderId)
                .map(u -> StringUtils.hasText(u.fullName()) ? u.fullName() : u.email())
                .orElse(null);
    }

    // ---- view mapping ----

    private List<ClassMemberViews.MemberSummary> toMemberSummaries(List<ClassMember> members) {
        if (members.isEmpty()) {
            return List.of();
        }
        Map<UUID, AppUser> usersById = userRepository.findAllById(
                        members.stream().map(ClassMember::studentId).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::id, u -> u));
        return members.stream().map(m -> toMemberSummary(m, usersById.get(m.studentId()))).toList();
    }

    private static ClassMemberViews.MemberSummary toMemberSummary(ClassMember member, AppUser student) {
        return new ClassMemberViews.MemberSummary(
                member.id(),
                member.studentId(),
                student != null ? student.email() : null,
                student != null ? student.fullName() : null,
                student != null ? student.status() : null,
                member.joinedAt());
    }

    // ---- access guard (owner/enrollment check, doc lap voi ClassManagementService) ----

    private Classroom requireAccessibleClass(UUID classId) {
        Classroom classroom = requireClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (classroom.isOwnedBy(currentUserId) || classMemberRepository.existsByClassIdAndStudentId(classId, currentUserId)) {
            return classroom;
        }
        throw new ForbiddenOperationException("You do not have access to this class.");
    }

    private Classroom requireOwnedClass(UUID classId) {
        Classroom classroom = requireClass(classId);
        UUID currentUserId = currentUserProvider.requireUserId();
        if (!classroom.isOwnedBy(currentUserId)) {
            throw new ForbiddenOperationException("You can only manage your own class.");
        }
        return classroom;
    }

    private Classroom requireOwnedActiveClass(UUID classId) {
        Classroom classroom = requireOwnedClass(classId);
        if (!classroom.isActive()) {
            throw new ForbiddenOperationException("Class is inactive and read-only.");
        }
        return classroom;
    }

    private Classroom requireClass(UUID classId) {
        return classRepository.findById(classId)
                .orElseThrow(() -> new ResourceNotFoundException("Class not found."));
    }

    // ---- validate email (1 email) ----

    private static String requireEmail(String rawEmail) {
        if (!StringUtils.hasText(rawEmail)) {
            throw new IllegalArgumentException("Truong nay la bat buoc.");
        }
        String email = rawEmail.trim().toLowerCase();
        if (!isValidEmail(email)) {
            throw new IllegalArgumentException("Vui long nhap dia chi email hop le.");
        }
        return email;
    }

    private static String normalizeEmail(String raw) {
        return StringUtils.hasText(raw) ? raw.trim().toLowerCase() : null;
    }

    private static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    // ---- import file parsing (.csv / .xlsx, cot bat buoc "gmail") ----

    private record ParsedRow(int rowNumber, String rawEmail) {
    }

    private List<ParsedRow> parseFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File trong. Vui long chon file .csv hoac .xlsx co du lieu.");
        }
        String extension = extractExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "Dinh dang file khong duoc ho tro (\"." + extension + "\"). Chi chap nhan .csv hoac .xlsx.");
        }
        List<List<String>> table;
        try (InputStream input = file.getInputStream()) {
            table = "csv".equals(extension) ? parseCsv(input) : parseXlsx(input);
        } catch (IOException | RuntimeException ex) {
            throw new IllegalArgumentException(
                    "Khong doc duoc noi dung file. File co the bi hong hoac khong dung dinh dang ." + extension + ".");
        }
        if (table.isEmpty()) {
            throw new IllegalArgumentException("File khong co du lieu. Vui long them dong tieu de va it nhat 1 dong hoc sinh.");
        }
        int emailColumnIndex = findColumnIndex(table.get(0), REQUIRED_COLUMN);
        if (emailColumnIndex < 0) {
            throw new IllegalArgumentException(
                    "Khong tim thay cot \"gmail\" trong dong tieu de. Vui long dat ten cot dung la \"gmail\".");
        }
        List<ParsedRow> rows = new ArrayList<>();
        for (int i = 1; i < table.size(); i++) {
            List<String> cells = table.get(i);
            String rawEmail = emailColumnIndex < cells.size() ? cells.get(emailColumnIndex) : null;
            rows.add(new ParsedRow(i + 1, rawEmail));
        }
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("File chi co dong tieu de, khong co hoc sinh nao de import.");
        }
        return rows;
    }

    private static int findColumnIndex(List<String> header, String columnName) {
        for (int i = 0; i < header.size(); i++) {
            if (header.get(i) != null && header.get(i).trim().equalsIgnoreCase(columnName)) {
                return i;
            }
        }
        return -1;
    }

    private static String extractExtension(String filename) {
        if (filename == null) {
            return "";
        }
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase() : "";
    }

    private static List<List<String>> parseCsv(InputStream input) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(input, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                rows.add(splitCsvLine(line));
            }
        }
        return rows;
    }

    private static List<String> splitCsvLine(String line) {
        List<String> values = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        values.add(current.toString().trim());
        return values;
    }

    private static List<List<String>> parseXlsx(InputStream input) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();
        try (Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                List<String> cells = new ArrayList<>();
                short lastCell = row.getLastCellNum();
                for (int c = 0; c < lastCell; c++) {
                    Cell cell = row.getCell(c);
                    cells.add(cell != null ? formatter.formatCellValue(cell).trim() : "");
                }
                if (cells.stream().anyMatch(StringUtils::hasText)) {
                    rows.add(cells);
                }
            }
        }
        return rows;
    }
}
