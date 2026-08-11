# R2 — Tài khoản & vòng đời nhân sự

Quét ngày 2026-08-10 trên `main`.

Phạm vi: `be/.../service/auth/` (9 file, 1135 loc), `PrincipalController`, `ModeratorController`,
`ItStaffController`, `UserController`, `fe/app/user-management/`, `fe/app/it-staff/`.

Hai lượt: đọc tay (R2-01…R2-07) và `/code-review high` (R2-10…R2-16).

Khác R1 ở một điểm quan trọng: **transaction ở đây phủ tốt**. 6/9 file có `@Transactional`, mọi method
mutating đều được bao. Không lặp lại lỗi hệ thống R1-02. Vấn đề của R2 nằm ở hai chỗ khác — **bất đối xứng
giữa ba đường quản lý tài khoản** (đọc tay), và **một trường dữ liệu mới thêm vào bị null hoá âm thầm
khắp nơi** (lượt tự động).

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R2-01 | `PrincipalModeratorService.java:138` | Nút "Thu hồi" moderator luôn trả 403, không có đường nào thành công | **Cao** | Sửa |
| R2-02 | `PrincipalModeratorService.java:105,201` | BR-41 là check-then-act, không có ràng buộc DB → race tạo 2 moderator cùng môn | **Cao** | Sửa |
| R2-03 | `PrincipalItStaffService.java:40,63` | IT Staff thiếu cả ba lớp bảo vệ mà Moderator có | **Cao** | Đã sửa |
| R2-04 | `ModeratorTeacherService.java:112-122` | `addTeacher` vượt ranh giới môn học mà chính class này canh ở chỗ khác | **Cao** | Đã sửa |
| R2-10 | `AppUser.java:27,41` | Hai constructor tiện lợi âm thầm null hoá `dateOfBirth` ở 15 call site | **Cao** | Đã sửa |
| R2-11 | `ProfileService.java:41` | Sửa hồ sơ cá nhân xoá mất ngày sinh, kẹt luồng thêm học sinh vào lớp | **Cao** | Đã sửa |
| R2-12 | `fe/app/user-management/page.tsx:77` | Phân trang hỏng: FE đọc `page`, backend trả `number` | **Cao** | Đã sửa |
| R2-05 | `ModeratorTeacherService.java:112` | Không kiểm tra vai trò cũ khi tái sử dụng tài khoản DISABLED | TB | Đã sửa |
| R2-06 | `service/auth/` (cả package) | Không service nào gửi thông báo cho người bị thao tác (BR-49) | TB | Sửa |
| R2-13 | `ModeratorTeacherService.java:161` | Thu hồi tài khoản không thu hồi phiên đăng nhập — giữ quyền tới 60 phút | TB | Đã sửa |
| R2-14 | `fe/app/it-staff/activity-log/page.tsx:77` | Bộ lọc ngày "đến" loại bỏ trọn ngày được chọn | TB | Đã sửa |
| R2-07 | `ModeratorTeacherService.java:161` | Thu hồi giáo viên bỏ lại tài nguyên họ đang sở hữu | TB | Đã sửa |
| R2-15 | `fe/app/user-management/page.tsx:623` | Số liệu "Đang hoạt động" đếm theo trang, đặt cạnh "Tổng số" toàn hệ thống | Thấp | Sửa |
| R2-16 | `PrincipalItStaffService.java:41` | Bỏ qua `normalizeEmail` → email quá dài thành 500 thay vì 400 | Thấp | Sửa |

---

## R2-01 — Nút "Thu hồi" moderator luôn trả 403 **[Cao]**

`PrincipalModeratorService.deleteModerator():138-142` ném `ForbiddenOperationException` **vô điều kiện**,
không hề đọc tham số `id`:

```java
@Transactional
public void deleteModerator(UUID id) {
    throw new ForbiddenOperationException(
            "Không thể thu hồi moderator độc lập. Hãy chỉ định moderator thay thế trước.");
}
```

Nhưng endpoint vẫn còn sống (`PrincipalController.java:69`, `DELETE /api/principal/moderators/{id}`) và
FE vẫn gọi nó: `fe/app/user-management/page.tsx:314`.

**Kịch bản lỗi:** Principal thấy nút "Thu hồi" bên cạnh moderator, bấm vào, luôn nhận 403. Không có
trạng thái nào của hệ thống làm nút đó thành công. Ý định BR-44 (bắt buộc có người thay) là đúng, nhưng
cài bằng cách **để nguyên nút rồi ném lỗi** thay vì ẩn nút hoặc chuyển thẳng sang hộp thoại replacement
vốn đã tồn tại (`user-management:342`).

So sánh: cùng màn hình đó, nút thu hồi IT Staff (`:419`) thì **thành công ngay** không cần người thay —
xem R2-03. Hai nút trông giống hệt nhau, hành vi ngược nhau hoàn toàn.

## R2-02 — BR-41 không có ràng buộc ở tầng DB **[Cao]**

`addModerator():105` và `reactivateModerator():201` đều theo mẫu check-then-act:

```java
if (userRepository.existsActiveByRoleAndSubject(Role.MODERATOR, subject)) throw ...;
// ... rồi mới save()
```

Toàn bộ migration chỉ có hai ràng buộc liên quan: `V5__create_roles_and_user_roles.sql:20`
`UNIQUE (user_id, role_id)` và `V6__enforce_single_user_role.sql:28` `uq_user_roles_user UNIQUE (user_id)`.
**Không có unique index nào cho "mỗi môn đúng 1 moderator đang hoạt động".**

**Kịch bản lỗi:** hai Principal (hoặc một Principal mở hai tab, hoặc một lần double-click vượt qua guard
FE) cùng thêm moderator môn Vật lý. Ở mức isolation mặc định READ_COMMITTED, cả hai transaction đều đọc
thấy "chưa có moderator Vật lý", cả hai cùng commit. Hệ thống có 2 moderator cùng môn — vi phạm BR-41 và
**không có cơ chế nào phát hiện hay sửa về sau**, vì mọi lần đọc sau đó chỉ hỏi "có tồn tại không".

**Sửa:** thêm partial unique index ở tầng DB, ví dụ trên `(subject)` với điều kiện role = MODERATOR và
status <> DISABLED, rồi bắt `DataIntegrityViolationException` map sang 409. Lưu ý quy tắc repo: viết và
chạy migration này như một bước riêng, có chủ ý, trước khi khởi động backend — không để Flyway tự xử lý.

## R2-03 — IT Staff thiếu cả ba lớp bảo vệ mà Moderator có **[Cao]**

Xác nhận lại mục B3 và A5 của `after8_9.md`, nay có thêm bằng chứng từ cả hai phía:

| | Moderator | IT Staff |
| --- | --- | --- |
| BR-41 "mỗi vị trí 1 tài khoản Active" khi thêm | `PrincipalModeratorService:105` | **không có** — `PrincipalItStaffService.add():40` không kiểm tra gì |
| BR-44 bắt buộc có người thay khi thu hồi | `deleteModerator():138` chặn cứng | **không có** — `disable():63` thu hồi thẳng |
| Endpoint thay thế | `POST /moderators/{id}/replacement` (`PrincipalController:76`) | **không có** — chỉ có 95/102/108/112 |
| Kiểm tra vai trò cũ khi tái dùng tài khoản DISABLED | `prepareExistingReplacement():228-241` | **không có** |

**Kịch bản lỗi:** Principal thu hồi IT Staff cuối cùng. Thao tác thành công, không cảnh báo. Hệ thống
rơi vào trạng thái **0 IT Supporter Active** — không ai sửa được system prompt
(`ItStaffController:15` yêu cầu `hasRole('IT_STAFF')`), không ai đọc được nhật ký audit. Chỉ Principal
mới thêm lại được, và nếu Principal cũng không truy cập được thì hệ thống kẹt.

## R2-04 — `addTeacher` vượt ranh giới môn học mà chính class này canh ở chỗ khác **[Cao]**

`ModeratorTeacherService` thực thi rất chặt luật "moderator chỉ quản lý giáo viên cùng môn" — ở hai
trong ba method:

- `deleteTeacher():157` — `if (user.subject() != moderatorSubject) throw ForbiddenOperationException`
- `reactivateTeacher():185` — điều kiện y hệt

Nhưng `addTeacher():112-122`, khi email trùng một tài khoản đang DISABLED, **ghi đè thẳng** `subject`
thành `moderatorSubject` mà không hề đọc môn cũ:

```java
AppUser reactivated = userRepository.save(new AppUser(
        u.id(), u.email(), u.googleSub(), ...,
        moderatorSubject, UserStatus.INVITED, u.createdAt(), u.lastLoginAt()));
```

**Kịch bản lỗi:** moderator Hoá thu hồi giáo viên Hoá X. Moderator Vật lý gõ email của X vào ô "Thêm giáo
viên" → X sống lại thành giáo viên **Vật lý**. Moderator Vật lý vừa lấy mất một tài khoản mà luật của
chính class này cấm họ chạm vào qua `deleteTeacher`/`reactivateTeacher`.

Cùng một luật, ba method, hai canh và một để hở — đây là dạng lỗi chỉ lộ ra khi đọc cả class chứ không
phải từng method.

## R2-05 — Không kiểm tra vai trò cũ khi tái sử dụng tài khoản DISABLED **[TB]**

Đường replacement của Moderator có guard đầy đủ: `prepareExistingReplacement():228-241` dùng
`INELIGIBLE_ROLE_LABELS` (STUDENT / PRINCIPAL / IT_STAFF) để từ chối, kèm thông điệp riêng cho từng vai trò.

Hai đường tạo tài khoản còn lại không có gì tương đương:
- `ModeratorTeacherService.addTeacher():112-128`
- `PrincipalItStaffService.add():44-56`

Vì `replaceRole()` kết hợp `uq_user_roles_user UNIQUE (user_id)` là mô hình **một vai trò mỗi tài khoản**,
thao tác này *thay* vai trò cũ chứ không cộng thêm. Một Moderator có thể lấy tài khoản Hiệu trưởng đã bị
vô hiệu hoá và biến nó thành giáo viên môn mình, giữ nguyên `googleSub` (`:118`) nên chủ tài khoản cũ
đăng nhập lại sẽ thấy mình là giáo viên.

Không phải leo thang đặc quyền cho kẻ thao tác (vai trò bị hạ chứ không nâng), nhưng là việc một Moderator
không được phép làm với tài khoản thuộc thẩm quyền Principal.

## R2-06 — Không service nào gửi thông báo cho người bị thao tác **[TB]**

Xác nhận BR-49 (`after8_9.md` B1). Cả ba service đều inject `ActivityLogService` và ghi log đầy đủ
(`GRANT_*`, `REVOKE_*`, `REACTIVATE_*`, `REPLACE_MODERATOR`), nhưng không service nào inject
`NotificationService`. Người bị thu hồi quyền, bị đổi vai trò, hay bị thay thế đều không nhận được gì —
họ chỉ phát hiện khi đăng nhập và thấy giao diện đã khác.

Hạ tầng đã sẵn: `NotificationService.notifyRecipient(...)` đang được `LibraryContentService:63,77` dùng.

## R2-07 — Thu hồi giáo viên bỏ lại tài nguyên đang sở hữu **[TB, cần R4 xác nhận]**

`deleteTeacher():161-165` chỉ đổi `status` thành DISABLED. Không đụng tới lớp học họ phụ trách, weekly
task đã giao, hay nội dung thư viện họ sở hữu.

Cần R4 (Lớp học) xác nhận hệ quả cụ thể: học sinh trong lớp của một giáo viên DISABLED có còn nộp bài
được không, và ai chấm. Ghi ở đây để R4 kiểm chứng chứ chưa kết luận.

---

## R2-10 — Hai constructor tiện lợi âm thầm null hoá `dateOfBirth` **[Cao]**

`AppUser` là record 13 thành phần, thành phần cuối là `dateOfBirth` (`AppUser.java:25`). Nhưng record
này có thêm **hai constructor tiện lợi** (10 tham số ở `:27`, 12 tham số ở `:41`) và cả hai đều truyền
`null` cho `dateOfBirth`:

```java
public AppUser(UUID id, String email, ..., Instant createdAt, Instant lastLoginAt) {
    this(id, email, googleSub, fullName, avatarUrl, contactInfo, null, null,
         subject, status, createdAt, lastLoginAt, null);   // <- dateOfBirth = null
}
```

`dateOfBirth` được thêm vào record ở commit `4860088 (add: code class p1)` **kèm hai overload này để
code cũ vẫn biên dịch được**. Kết quả: mọi call site cũ compile trót lọt và từ đó **null hoá trường này
mỗi lần save**. 15 chỗ đang dùng overload: `ProfileService:41`, `PrincipalModeratorService:115,127,166,171,206,247`,
`ModeratorTeacherService:117,130,161,191`, `PrincipalItStaffService:48,52,65,77`.

`JpaAppUserRepository.save` ghi vô điều kiện `e.setDateOfBirth(user.dateOfBirth())`, nên đây là ghi đè
thật xuống DB chứ không chỉ là đối tượng trong bộ nhớ.

Đây chính là chỗ tôi đọc lướt ở lượt đọc tay: tôi đếm arity, thấy "à có constructor rút gọn", rồi bỏ qua
mà không kiểm nó điền gì vào chỗ trống.

**Sửa:** xoá hai overload, buộc mọi call site truyền `user.dateOfBirth()`. Khi đó lần sau thêm trường
mới, compiler sẽ bắt lỗi thay vì để nó âm thầm thành null. `AuthService.loginWithGoogle:108` đang dùng
đúng constructor 13 tham số — có sẵn mẫu.

## R2-11 — Sửa hồ sơ cá nhân xoá mất ngày sinh, kẹt luồng thêm học sinh vào lớp **[Cao]**

Ca cụ thể nghiêm trọng nhất của R2-10. `ProfileService:41` dựng `AppUser` bằng overload 12 tham số, và
`PATCH /api/users/me` không giới hạn vai trò nên **học sinh cũng gọi được**.

**Kịch bản lỗi:** giáo viên thêm học sinh vào lớp qua `ClassEnrollmentService`, trong đó `dateOfBirth`
là **bắt buộc** (`validateProfileMessage` từ chối null). Sau đó học sinh đăng nhập và sửa bio hoặc số
điện thoại → ngày sinh bị xoá về NULL. Khi một giáo viên khác thêm chính email đó vào lớp thứ hai,
`sameProfile` (`ClassEnrollmentService.java:457`) tính `profile.dateOfBirth().equals(null)` → false →
báo `PROFILE_MISMATCH`, và `ExistingAccountInfo` trả về ngày sinh null.

Giáo viên **không thể xử lý** tình huống này: ô ngày sinh null không nhập lại được từ màn hình đó.

## R2-12 — Phân trang hỏng: FE đọc `page`, backend trả `number` **[Cao]**

`PrincipalController.listModerators:48` (và `listItStaffs`, `ModeratorController.listTeachers`) trả về
`org.springframework.data.domain.Page` **thô**. Ba endpoint này là những chỗ duy nhất trong backend làm
vậy — mọi endpoint phân trang khác đều dùng DTO riêng (`NotificationViews.Page:171`,
`ActivityLogViews.Page`, `WeeklyTaskViews.Page`) và các DTO đó *thật sự* có trường `page`.

Đã kiểm: không có `spring.data.web.pageable.serialization-mode` trong `application.properties`, cũng
không có `@EnableSpringDataWebSupport` ở đâu trong `src/main/java`. Boot 3.4.5 serialize `PageImpl` trực
tiếp, và trường số trang là **`number`**, không phải `page`.

FE khai `PageResponse<T>` với `page: number` (`user-management/page.tsx:77`) → luôn nhận `undefined`.

**Kịch bản lỗi** với 25 giáo viên (2 trang): `<Pager page={teacherData.page}>` (`:710`) nhận `undefined`
→ hiện "Trang NaN/2". Cả hai điều kiện `disabled={page <= 0}` và `disabled={page >= totalPages - 1}` đều
false (mọi so sánh với `undefined` đều false) nên **cả hai mũi tên đều bật**. Bấm bất kỳ mũi tên nào →
`onChange(undefined ± 1)` = `NaN` → `GET /api/moderator/teachers?page=NaN&size=20` → binding `int page`
thất bại → **500**. Ngoài ra `loadX(data?.page ?? 0)` sau mỗi lần thêm/thu hồi luôn nhảy về trang 0.

## R2-13 — Thu hồi tài khoản không thu hồi phiên đăng nhập **[TB]**

`deleteTeacher:161`, `PrincipalItStaffService.disable:65`, và `PrincipalModeratorService.replaceModerator:178`
chỉ đổi `status`/vai trò trong DB. `refreshTokenRepository.revokeAllByUserId` được gọi từ **đúng một chỗ**
trong cả tầng service: `AuthService:129`, khi phát hiện tái sử dụng token.

`JwtAuthenticationFilter` xác thực access token **stateless**, nên người bị thu hồi lúc 10:00 vẫn dùng
API bình thường cho tới khi token hết hạn (`app.auth.jwt.access-ttl` mặc định `PT60M`).

Nặng nhất ở `replaceModerator` với `disablePrevious=false`: token của moderator vừa bị hạ cấp **vẫn mang
`roles=[MODERATOR]`** và subject cũ, nên trong tối đa một giờ họ vẫn gọi được
`POST /api/moderator/teachers` và `DELETE /api/moderator/teachers/{id}` trên môn mà họ không còn phụ trách.

Tối thiểu nên gọi `revokeAllByUserId` khi thu hồi/hạ cấp để chặn gia hạn ngầm và giới hạn cửa sổ.

## R2-14 — Bộ lọc ngày "đến" loại bỏ trọn ngày được chọn **[TB]**

`fe/app/it-staff/activity-log/page.tsx:77` — `new Date("2026-08-10").toISOString()` cho
`2026-08-10T00:00:00.000Z`, còn `JpaActivityLogRepository.search:61` lọc `createdAt <= to`. Nên chọn
"đến = hôm nay" chỉ trả về bản ghi trước nửa đêm UTC hôm nay; đặt from = to = cùng một ngày thì **luôn
ra 0 dòng** dù ngày đó có hoạt động.

Dòng 76 lỗi đối xứng: `from` ở nửa đêm UTC là 07:00 giờ địa phương (UTC+7), nên "từ hôm nay" âm thầm bỏ
mọi bản ghi từ 00:00 đến 07:00 giờ Việt Nam.

## R2-15 — Số liệu đếm theo trang đặt cạnh tổng số toàn hệ thống **[Thấp]**

`fe/app/user-management/page.tsx:623` — `totalElements` (toàn hệ thống) nằm ngay cạnh
`content.filter(...).length` (tối đa 20, chỉ trang hiện tại). Với 45 giáo viên, header đọc là
"Tổng số 45 · Đang hoạt động 20 · Đã thu hồi 0" — tự mâu thuẫn. Lặp ở `:514/519` (moderator, tối đa 3
nên chưa lộ) và `:724/729` (IT staff).

## R2-16 — Bỏ qua `normalizeEmail` khiến email quá dài thành 500 **[Thấp]**

`PrincipalItStaffService:41` tự viết `email.trim().toLowerCase()` trong khi hai service anh em đều đi
qua validator (`PrincipalModeratorService:99`, `ModeratorTeacherService:105`) — đúng thứ mà commit
`2aa2020 (fix(be): centralize app user field validation)` đặt ra để thống nhất.

Hệ quả cụ thể: `AddItStaffRequest` có `@NotBlank @Email` nhưng **không có `@Size`**, nên email dài hơn
cột `VARCHAR(320)` (`V2__create_auth.sql:7`) qua được bean validation rồi chết lúc flush thành
`DataIntegrityViolationException` → **500**, thay vì 400 kèm thông điệp tiếng Việt mà `requireMaxLength`
sẽ tạo ra.

Đính chính: ở lượt đọc tay tôi ghi chỗ này là "lệch nhỏ, không gây lỗi" — sai, nó có đường dẫn tới 500.

---

## Kiểm tra nhưng không có vấn đề

- **Transaction**: 6/9 file trong `service/auth/` có `@Transactional`; mọi method mutating của ba service
  quản lý tài khoản đều được bao. `replaceModerator():177` còn có comment giải thích rõ chủ ý nguyên tử.
  Không lặp lại R1-02.
- **Phân quyền**: `PrincipalController:34` có `@PreAuthorize("hasRole('PRINCIPAL')")` ở cấp class;
  `ItStaffController:15` có `hasRole('IT_STAFF')`. Không có endpoint mutating nào hở.
- **Đăng nhập sau khi thu hồi**: `AuthService:84,140` chặn đúng `UserStatus.DISABLED`. Trạng thái
  `INVITED` mà các đường reactivate đặt lại vẫn đăng nhập được — không phải bug.
- **Chuẩn hoá đầu vào**: `AppUserFieldValidator.normalizeEmail/normalizeOptionalFullName` được dùng nhất
  quán ở `PrincipalModeratorService` và `ModeratorTeacherService`. (`PrincipalItStaffService:41` thì
  không — xem R2-16, chỗ này **có** gây lỗi 500.)
- **Ràng buộc khối lớp**: `normalizeGrades():206-218` chặn rỗng và chặn ngoài 10–12, khử trùng lặp, sắp xếp.
