# Account Management — API Design

> Quản lý tài khoản phân cấp: Principal cấp/thu hồi Moderator, Moderator cấp/thu hồi Teacher.
> Giai đoạn này **chưa** có RBAC đầy đủ (sẽ làm plan riêng).
> Auth nền: [`auth.md`](./auth.md).

## Quyết định riêng

- **Chỉ BE**: giai đoạn này chỉ làm API backend + design docs. FE sẽ làm sau.
- **Phân cấp cứng**: Principal → Moderator → Teacher (3 bậc). Moderator **chỉ quản lý Teacher cùng subject**.
- **Xoá InterimRoleSeedRunner**: không còn seed tài khoản tạm từ env var nữa. Principal sẽ thêm moderator đầu tiên qua API sau khi đăng nhập bằng principal seed.
- **Soft-delete khi thu hồi**: set `status = DISABLED` thay vì xóa cứng (giữ audit trail).
- **Không tách bảng `user_roles`**: giữ cấu trúc `app_users` hiện tại + thêm cột audit. Khi làm RBAC sau sẽ migrate.

## Thay đổi data model (Flyway V4)

```sql
ALTER TABLE app_users
  ADD COLUMN granted_by  UUID REFERENCES app_users(id),
  ADD COLUMN granted_at  TIMESTAMPTZ;
```

## Danh sách endpoint

| # | Method | Path | Role | UC | Mô tả |
|---|--------|------|------|----|-------|
| 1 | GET | `/api/principal/moderators` | PRINCIPAL | UC-60 | Danh sách moderator (phân trang) |
| 2 | POST | `/api/principal/moderators` | PRINCIPAL | UC-61 | Thêm moderator = email + subject |
| 3 | DELETE | `/api/principal/moderators/{id}` | PRINCIPAL | UC-62 | Thu hồi moderator |
| 4 | GET | `/api/moderator/teachers` | MODERATOR | UC-13 | Danh sách teacher cùng subject |
| 5 | POST | `/api/moderator/teachers` | MODERATOR | UC-14 | Thêm teacher (chỉ subject của mình) |
| 6 | DELETE | `/api/moderator/teachers/{id}` | MODERATOR | UC-15 | Thu hồi teacher |

## Chi tiết

### 1. `GET /api/principal/moderators` — Danh sách Moderator

```
query: ?page=0&size=20
→ 200  { items: [ ModeratorDto ], page, size, totalElements }
→ 403  role ≠ PRINCIPAL
```

- Chỉ trả user có `role = MODERATOR`, sắp theo `created_at` giảm dần.
- `ModeratorDto`: `{ id, email, fullName, subject, status, grantedAt, grantedByEmail }`

### 2. `POST /api/principal/moderators` — Thêm Moderator

```
body: { email, subject, fullName? }
→ 201  ModeratorDto
→ 400  email invalid / subject không hợp lệ
→ 409  email đã tồn tại trong hệ thống
→ 403  role ≠ PRINCIPAL
```

- `subject` bắt buộc (Moderator phải gắn với một môn)
- Tạo user mới: `role = MODERATOR`, `status = INVITED`, `granted_by = currentUserId`, `granted_at = now`
- Moderator được tự động gán cả ba khối `10`, `11`, `12` trong `teacher_grades`, để có thể quản lý lớp của môn mình phụ trách.
- Email được chuẩn hóa về lowercase trim

### 2a. `POST /api/principal/moderators/{id}/replacement` — Thay Moderator

```
body: { replacementEmail, disablePrevious, previousTeacherGrades? }
→ 200 ModeratorDto
→ 400 previousTeacherGrades thiếu/rỗng khi disablePrevious = false
```

- Moderator thay thế tự động được gán khối `10`, `11`, `12`.
- Nếu `disablePrevious = false`, Moderator cũ chuyển thành Teacher và bắt buộc chọn ít nhất một khối qua `previousTeacherGrades`.
- Nếu `disablePrevious = true`, tài khoản cũ bị vô hiệu hóa; không nhận hoặc thay đổi phân công khối Teacher.

### 3. `DELETE /api/principal/moderators/{id}` — Thu hồi Moderator

```
→ 204 No Content
→ 404  không tồn tại / đã DISABLED / không phải MODERATOR
→ 403  role ≠ PRINCIPAL
```

- Soft-delete: `status = DISABLED`

### 4. `GET /api/moderator/teachers` — Danh sách Teacher (cùng subject)

```
query: ?page=0&size=20
→ 200  { items: [ TeacherDto ], page, size, totalElements }
→ 403  role ≠ MODERATOR
```

- Chỉ trả user có `role = TEACHER` **và** `subject = subject của moderator hiện tại** (đọc từ AccessTokenClaims)
- `TeacherDto`: `{ id, email, fullName, subject, status, grantedAt, grantedByEmail }`

### 5. `POST /api/moderator/teachers` — Thêm Teacher

```
body: { email, subject, fullName? }
→ 201  TeacherDto
→ 400  email invalid / subject không hợp lệ
→ 403  role ≠ MODERATOR, HOẶC subject khác với subject của moderator
→ 409  email đã tồn tại
```

- **Gate subject**: nếu `request.subject != moderator.subject` → 403.
- Tạo user mới: `role = TEACHER`, `status = INVITED`, `granted_by = currentUserId`, `granted_at = now`

### 6. `DELETE /api/moderator/teachers/{id}` — Thu hồi Teacher

```
→ 204 No Content
→ 403  role ≠ MODERATOR, HOẶC teacher.subject != moderator.subject
→ 404  không tồn tại / đã DISABLED / không phải TEACHER
```

- Soft-delete: `status = DISABLED`

## Cross-cutting

- **RBAC**: `@PreAuthorize("hasRole('PRINCIPAL')")` cho #1-3; `@PreAuthorize("hasRole('MODERATOR')")` cho #4-6.
- **Subject scope (Moderator)**: check trong service layer — so `currentUser.subject()` với `teacher.subject` (hoặc `request.subject` khi add).
- **Auth/JWT filter, rate-limit**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build

1. Flyway V4: alter `app_users` + migrate dữ liệu seed cũ (thêm `granted_by`, `granted_at`)
2. Domain: cập nhật `AppUser` record + `AppUserEntity` + `JpaAppUserRepository`
3. Repository: thêm `findAllByRole`, `findAllByRoleAndSubject` vào `AppUserRepository` + `AppUserJpaRepository`
4. Service: `PrincipalModeratorService`, `ModeratorTeacherService`
5. DTO: `ModeratorDto`, `TeacherDto`, `AddModeratorRequest`, `AddTeacherRequest`
6. Controller: `PrincipalController`, `ModeratorController`
7. Xoá `InterimRoleSeedRunner`
8. Sửa `PrincipalSeedRunner`: thêm `granted_by = null, granted_at = now` (principal đầu tiên tự cấp)
9. Kiểm tra với Swagger

## Điểm mở

- Sau này khi có RBAC: migrate `app_users` → `user_profiles` + `user_roles`, `granted_by`/`granted_at` thành cột trong `user_roles`.
