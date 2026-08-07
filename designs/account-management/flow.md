# Account Management — Flow

> Luồng cấp quyền phân cấp 3 bậc: Principal → Moderator → Teacher.
> API spec: [`../API_designs/account-management.md`](../API_designs/account-management.md).

## 1. Tổng quan

Hệ thống có 3 role xếp theo thứ bậc:

```
Principal  ──cấp/thu hồi──▶  Moderator (gắn với 1 subject)
                                    │
                                    └──cấp/thu hồi──▶  Teacher (cùng subject)
```

- **Principal**: cấp/thu hồi Moderator, quản lý toàn hệ thống
- **Moderator (Head of Subject)**: cấp/thu hồi Teacher **trong môn mình phụ trách**
- **Teacher**: chỉ dùng tính năng, không cấp quyền

## 2. Luồng cấp quyền

### 2.1 Principal thêm Moderator

```
Principal                    Backend                      Database
  │                         │                            │
  │ POST /api/principal/moderators                          │
  │ { email, subject }      │                            │
  │────────────────────────▶│                            │
  │                         │  Kiểm tra:                 │
  │                         │  • currentUser.role == ADMIN?
  │                         │  • email hợp lệ?           │
  │                         │  • email đã tồn tại?       │
  │                         │  • subject ∈ {MATH, CHEMISTRY, PHYSICS}?
  │                         │                            │
  │                         │  INSERT app_users          │
  │                         │  (role=MODERATOR,          │
  │                         │   status=INVITED,          │
  │                         │   granted_by=adminId,      │
  │                         │   granted_at=now)          │
  │                         │───────────────────────────▶│
  │                         │                            │
  │ 201 ModeratorDto        │                            │
  │◀────────────────────────│                            │
```

### 2.2 Moderator thêm Teacher

```
Moderator                Backend                      Database
  │                         │                            │
  │ POST /api/moderator/teachers                        │
  │ { email, subject }      │                            │
  │────────────────────────▶│                            │
  │                         │  Kiểm tra:                 │
  │                         │  • currentUser.role == MOD?
  │                         │  • request.subject == moderator.subject?
  │                         │  • email hợp lệ?           │
  │                         │  • email đã tồn tại?       │
  │                         │                            │
  │                         │  INSERT app_users          │
  │                         │  (role=TEACHER,            │
  │                         │   subject=moderatorSubject,
  │                         │   status=INVITED,          │
  │                         │   granted_by=modId,        │
  │                         │   granted_at=now)          │
  │                         │───────────────────────────▶│
  │                         │                            │
  │ 201 TeacherDto          │                            │
  │◀────────────────────────│                            │
```

## 3. Subject scope enforcement

Moderator chỉ quản lý Teacher trong môn của mình. Logic check ở service:

```
moderatorSubject = currentUser.subject()  // từ JWT claims
teacherSubject   = teacher.subject         // từ DB

if (moderatorSubject != teacherSubject) → 403 Forbidden
  message: "Bạn chỉ có thể quản lý giáo viên môn {moderatorSubject}."
```

Áp dụng cho cả 3 endpoint của Moderator:
- **List teacher**: tự động filter `WHERE role=TEACHER AND subject=moderatorSubject`
- **Add teacher**: check `request.subject == moderatorSubject`
- **Delete teacher**: check `teacher.subject == moderatorSubject`

## 4. So sánh: trước vs sau

| Khía cạnh | InterimRoleSeedRunner (cũ) | Account Management (mới) |
|------------|---------------------------|--------------------------|
| Tài khoản | Cố định từ env var | Thêm qua API, lưu DB |
| Vai trò cấp quyền | Không có | Principal → Moderator → Teacher |
| Audit | Không ai cấp | Có `granted_by`, `granted_at` |
| Xoá tài khoản | Không có | Soft-delete (DISABLED) |
| Subject scope | Không kiểm tra | Moderator chỉ quản lý cùng môn |

## 5. Principal seed đầu tiên

`PrincipalSeedRunner` vẫn chạy, tạo tài khoản PRINCIPAL đầu tiên từ `APP_AUTH_PRINCIPAL_SEED_EMAIL`.
Môi trường cũ vẫn có thể dùng fallback `APP_AUTH_ADMIN_SEED_EMAIL` trong `application.properties`:
- `granted_by = null` (tự thân)
- `granted_at = now`

Principal này đăng nhập → dùng API `/api/principal/moderators` để thêm moderator → moderator thêm teacher → không cần `InterimRoleSeedRunner` nữa.

## 6. Xoá InterimRoleSeedRunner

Class `InterimRoleSeedRunner.java` bị xoá. Các biến env:
- `APP_AUTH_TEACHER_SEED_EMAIL`
- `APP_AUTH_TEACHER_SEED_SUBJECT`
- `APP_AUTH_MODERATOR_SEED_EMAIL`
- `APP_AUTH_MODERATOR_SEED_SUBJECT`

cũng được xoá khỏi `application.properties` và `.env.example`.

## 7. Thứ tự build (BE)

1. Flyway V4 migration
2. Cập nhật domain model + persistence
3. Thêm repository methods
4. Service (PrincipalModeratorService, ModeratorTeacherService)
5. DTO
6. Controller
7. Xoá InterimRoleSeedRunner + clean config
8. Kiểm tra với Swagger
