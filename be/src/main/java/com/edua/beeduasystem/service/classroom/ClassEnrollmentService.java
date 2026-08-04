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
import org.apache.poi.ss.usermodel.DateUtil;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
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
    public ClassMemberViews.MemberSummary addStudent(UUID classId, String rawFullName, String rawPhoneNumber,
                                                     LocalDate dateOfBirth, String rawEmail, boolean reuseExistingAccount) {
        Classroom classroom = requireOwnedActiveClass(classId);
        String email = requireEmail(rawEmail);
        StudentProfile profile = requireProfile(rawFullName, rawPhoneNumber, dateOfBirth, email);
        requireCapacity(classroom.id());
        requireEmailNotAlreadyEnrolled(classroom, email);
        AppUser student = resolveOrCreateStudent(profile, reuseExistingAccount);
        requireNotEnrolled(classroom, student.id());
        ClassMember saved = classMemberRepository.save(new ClassMember(
                UUID.randomUUID(), classroom.id(), student.id(), Instant.now()));
        notifyEnrollment(classroom, List.of(student.id()));
        return toMemberSummary(saved, student);
    }

    @Transactional
    public ClassMemberViews.ImportResult importStudents(UUID classId, MultipartFile file) {
        Classroom classroom = requireOwnedActiveClass(classId);
        List<ParsedRow> rows = parseFile(file);
        requireNoDuplicateEmailsInFile(rows);
        long baseCount = classMemberRepository.countByClassId(classroom.id());
        if (baseCount + rows.size() > MAX_CLASS_SIZE) {
            throw new IllegalArgumentException(
                    "Tệp có " + rows.size() + " học sinh; lớp hiện có " + baseCount
                            + ". Tổng sĩ số vượt quá " + MAX_CLASS_SIZE + ", nên không có học sinh nào được thêm.");
        }

        List<ClassMemberViews.SkippedRow> skipped = new ArrayList<>();
        List<UUID> notifyIds = new ArrayList<>();

        for (ParsedRow row : rows) {
            String email = normalizeEmail(row.rawEmail());
            if (email == null || !isValidEmail(email)) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), row.rawEmail(), "INVALID_FORMAT"));
                continue;
            }
            if (row.dateOfBirth() == null || !StringUtils.hasText(row.fullName()) || !StringUtils.hasText(row.phoneNumber())) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), row.rawEmail(), "INVALID_STUDENT_DATA"));
                continue;
            }
            try {
                requireEmailNotAlreadyEnrolled(classroom, email);
                AppUser student = resolveOrCreateStudent(requireProfile(row.fullName(), row.phoneNumber(), row.dateOfBirth(), email), false);
                requireNotEnrolled(classroom, student.id());
                classMemberRepository.save(new ClassMember(
                        UUID.randomUUID(), classroom.id(), student.id(), Instant.now()));
                notifyIds.add(student.id());
            } catch (ClassEnrollmentConflictException ex) {
                skipped.add(new ClassMemberViews.SkippedRow(row.rowNumber(), email, ex.reason()));
            } catch (DataAccessException ex) {
                throw new BulkEnrollmentFailedException("Thao tac that bai. Vui long thu lai.", ex);
            }
        }

        notifyEnrollment(classroom, notifyIds);
        return new ClassMemberViews.ImportResult(notifyIds.size(), skipped.size(), List.copyOf(skipped));
    }

    @Transactional
    public ClassMemberViews.RemoveResult removeStudent(UUID classId, UUID studentId, String reason) {
        Classroom classroom = requireOwnedClass(classId);
        if (!classMemberRepository.existsByClassIdAndStudentId(classId, studentId)) {
            throw new ResourceNotFoundException("Học sinh này không thuộc lớp " + classroom.name() + ".");
        }
        AppUser student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found."));

        if (student.status() == UserStatus.INVITED) {
            // Học sinh chưa từng đăng nhập: xóa sạch (hard-delete) — không có submission/hoạt động nào để giữ.
            classMemberRepository.deleteAllByStudentId(studentId);
            userRoleRepository.deleteByUserId(studentId);
            notificationRepository.deleteRecipientsByRecipientId(studentId);
            userRepository.deleteById(studentId);
            return new ClassMemberViews.RemoveResult("HARD_DELETE", false);
        }

        // Đã từng đăng nhập (ACTIVE/DISABLED): chỉ gỡ khỏi lớp này (soft-remove), giữ nguyên
        // tài khoản + submissions/dữ liệu trong lớp (BR-45); slot 60 chỗ được giải phóng vì dòng class_members bị xóa.
        classMemberRepository.deleteByClassIdAndStudentId(classId, studentId);
        boolean notified = false;
        if (student.status() == UserStatus.ACTIVE) {
            if (!StringUtils.hasText(reason)) {
                throw new IllegalArgumentException("Vui lòng nhập lý do xóa để gửi thông báo cho học sinh.");
            }
            notifyRemoval(classroom, student, reason.trim());
            notified = true;
        }
        return new ClassMemberViews.RemoveResult("SOFT_REMOVE", notified);
    }

    // ---- resolve-or-create AppUser theo email (dung chung cho add 1 email va tung dong import) ----

    private AppUser resolveOrCreateStudent(StudentProfile profile, boolean reuseExistingAccount) {
        String email = profile.email();
        UUID actorId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        Optional<AppUser> existing = userRepository.findByEmail(email);
        if (existing.isEmpty()) {
            AppUser created = userRepository.save(new AppUser(
                    UUID.randomUUID(), email, null, profile.fullName(), null, null,
                    null, profile.phoneNumber(), null, UserStatus.INVITED, now, null, profile.dateOfBirth()));
            userRoleRepository.replaceRole(created.id(), Role.STUDENT, actorId, now);
            return created;
        }
        AppUser user = existing.get();
        if (!reuseExistingAccount && !sameProfile(user, profile)) {
            // Giáo viên có thể nhập sai thông tin: trả kèm tài khoản cũ để FE hỏi "gán lại account cũ vào lớp không?".
            throw new ClassEnrollmentConflictException("PROFILE_MISMATCH",
                    "Email này đã tồn tại với thông tin hồ sơ khác. Bạn có muốn gán lại tài khoản cũ vào lớp?",
                    new ClassMemberViews.ExistingAccountInfo(
                            user.email(), user.fullName(), user.phoneNumber(), user.dateOfBirth(), user.status()));
        }
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

    private void requireNotEnrolled(Classroom classroom, UUID studentId) {
        if (classMemberRepository.existsByClassIdAndStudentId(classroom.id(), studentId)) {
            throw new ClassEnrollmentConflictException("ALREADY_ENROLLED", "Học sinh này đã tồn tại trong lớp " + classroom.name() + ".");
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

    // ---- notification khi teacher xóa học sinh đã kích hoạt (soft-remove) ----

    private void notifyRemoval(Classroom classroom, AppUser student, String reason) {
        UUID senderId = currentUserProvider.requireUserId();
        Instant now = Instant.now();
        String title = "Ban da bi xoa khoi lop " + classroom.name();
        String content = "Giao vien da xoa ban khoi lop \"" + classroom.name() + "\". Ly do: " + reason;
        Notification saved = notificationRepository.createWithRecipients(
                new Notification(UUID.randomUUID(), senderId, classroom.subject(), title, content, now),
                List.of(student.id()));
        NotificationEvent event = new NotificationEvent(
                saved.id(), saved.title(), saved.content(), saved.subject(), resolveSenderName(senderId), saved.createdAt());
        notificationStreamPort.publishNew(student.id(), event);
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

    /** Gmail la dinh danh tai khoan, nen uu tien bao trung thanh vien truoc khi so sanh ho so. */
    private void requireEmailNotAlreadyEnrolled(Classroom classroom, String email) {
        userRepository.findByEmail(email)
                .filter(user -> classMemberRepository.existsByClassIdAndStudentId(classroom.id(), user.id()))
                .ifPresent(user -> {
                    throw new ClassEnrollmentConflictException(
                            "ALREADY_ENROLLED", "Học sinh này đã tồn tại trong lớp " + classroom.name() + ".");
                });
    }

    private static StudentProfile requireProfile(String rawFullName, String rawPhoneNumber, LocalDate dateOfBirth, String email) {
        if (!StringUtils.hasText(rawFullName) || !StringUtils.hasText(rawPhoneNumber) || dateOfBirth == null || !dateOfBirth.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Họ tên, số điện thoại và ngày sinh là các trường bắt buộc hợp lệ.");
        }
        return new StudentProfile(rawFullName.trim(), rawPhoneNumber.trim(), dateOfBirth, email);
    }

    private static boolean sameProfile(AppUser user, StudentProfile profile) {
        return profile.fullName().equals(user.fullName())
                && profile.phoneNumber().equals(user.phoneNumber())
                && profile.dateOfBirth().equals(user.dateOfBirth());
    }

    private static String normalizeEmail(String raw) {
        return StringUtils.hasText(raw) ? raw.trim().toLowerCase() : null;
    }

    private static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }

    // ---- import file parsing (.csv / .xlsx, cot bat buoc "gmail") ----

    private record StudentProfile(String fullName, String phoneNumber, LocalDate dateOfBirth, String email) {
    }

    /** Import la all-or-nothing voi Gmail trung trong tep: khong ghi dong nao neu tep chua sach. */
    private static void requireNoDuplicateEmailsInFile(List<ParsedRow> rows) {
        Map<String, Integer> firstRowByEmail = new HashMap<>();
        for (ParsedRow row : rows) {
            String email = normalizeEmail(row.rawEmail());
            if (email == null || !isValidEmail(email)) {
                continue;
            }
            Integer firstRow = firstRowByEmail.putIfAbsent(email, row.rowNumber());
            if (firstRow != null) {
                throw new IllegalArgumentException("Dòng " + row.rowNumber() + " trùng Gmail với dòng "
                        + firstRow + " (" + email + "). Hãy sửa tệp rồi gửi lại; không có học sinh nào được thêm.");
            }
        }
    }

    private record ParsedRow(int rowNumber, String fullName, String phoneNumber, LocalDate dateOfBirth, String rawEmail) {
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
        int fullNameColumn = findColumnIndex(table.get(0), "họ và tên");
        int phoneColumn = findColumnIndex(table.get(0), "số điện thoại");
        int birthDateColumn = findColumnIndex(table.get(0), "ngày/tháng/năm sinh");
        int emailColumnIndex = findColumnIndex(table.get(0), "gmail");
        if (fullNameColumn < 0 || phoneColumn < 0 || birthDateColumn < 0 || emailColumnIndex < 0) {
            throw new IllegalArgumentException(
                    "Tệp phải có đủ cột: Họ và tên | Số điện thoại | Ngày/tháng/năm sinh | Gmail.");
        }
        List<ParsedRow> rows = new ArrayList<>();
        for (int i = 1; i < table.size(); i++) {
            List<String> cells = table.get(i);
            String fullName = fullNameColumn < cells.size() ? cells.get(fullNameColumn) : null;
            String phoneNumber = phoneColumn < cells.size() ? cells.get(phoneColumn) : null;
            String birthDate = birthDateColumn < cells.size() ? cells.get(birthDateColumn) : null;
            String rawEmail = emailColumnIndex < cells.size() ? cells.get(emailColumnIndex) : null;
            rows.add(new ParsedRow(i + 1, fullName, phoneNumber, parseBirthDate(birthDate), rawEmail));
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

    private static LocalDate parseBirthDate(String rawValue) {
        if (!StringUtils.hasText(rawValue)) return null;
        String value = rawValue.trim();
        for (DateTimeFormatter formatter : List.of(
                DateTimeFormatter.ISO_LOCAL_DATE,
                DateTimeFormatter.ofPattern("d/M/uuuu"),
                DateTimeFormatter.ofPattern("d-M-uuuu"),
                DateTimeFormatter.ofPattern("d.M.uuuu"),
                DateTimeFormatter.ofPattern("d/M/uu"))) {
            try { return LocalDate.parse(value, formatter); }
            catch (DateTimeParseException ignored) { /* thu dinh dang ke tiep */ }
        }
        return null;
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
                    if (cell == null) {
                        cells.add("");
                        continue;
                    }
                    try {
                        cells.add(DateUtil.isCellDateFormatted(cell)
                                ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                                : formatter.formatCellValue(cell).trim());
                    } catch (RuntimeException ignored) {
                        // Mot o Excel co dinh dang bat thuong khong duoc lam hong ca tep;
                        // giu gia tri hien thi de validate va bao loi dung tai dong do.
                        cells.add(formatter.formatCellValue(cell).trim());
                    }
                }
                if (cells.stream().anyMatch(StringUtils::hasText)) {
                    rows.add(cells);
                }
            }
        }
        return rows;
    }
}
