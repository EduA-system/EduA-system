# Add Student — API Design

> Endpoint dac thu chuc nang **Add Student (UC-36, alias Enroll Student)**: Teacher them hoc sinh vao lop bang Gmail, thu cong tung email hoac import file CSV/Excel.
> Ha tang CRUD lop (tao/xem/sua/doi trang thai) tach o [`class-management.md`](./class-management.md).
> Luong & thiet ke trien khai BE: [`../add-student/flow.md`](../add-student/flow.md).
> Ha tang dung chung auth/RBAC/rate-limit theo [`api-chung.md`](./api-chung.md).

## Quyet dinh rieng

- **Bam sat SRS**: mapping truc tiep `UC-36 Add Student`. Khong lam `UC-37 Remove Student` trong tai lieu nay (xem "Diem mo").
- **Chi email, khong self-join**: dung mo hinh cua `class-management.md` — khong co class code/self-join. Teacher la nguoi duy nhat khoi tao viec them hoc sinh, bang Gmail cua hoc sinh.
- **Them `STUDENT` vao `Role` enum**: `domain/model/auth/Role.java` hien chi co `TEACHER, MODERATOR, PRINCIPAL, IT_STAFF`. `JwtTokenAdapter.issueAccessToken` goi `Role.primaryOf(roles)` va se throw neu tap role rong — nghia la neu tao `AppUser` moi cho hoc sinh ma khong gan role nao, hoc sinh do **khong dang nhap duoc**. Add Student phai gan `Role.STUDENT` (uu tien thap nhat trong `PRIORITY`) qua `UserRoleRepository.replaceRole` giong cach `ModeratorTeacherService.addTeacher` gan `Role.TEACHER`.
- **Khong tai su dung nguyen ven guard cua `addTeacher`**: `ModeratorTeacherService.addTeacher` chan luon khi email da ton tai va dang khong `DISABLED` (`DuplicateEmailException`). Add Student **khong the** ap dung y nguyen vi mot hoc sinh phai them duoc vao **nhieu lop**. Thay vao do:
  - Email chua ton tai → tao `AppUser` moi, `status = INVITED`, gan `Role.STUDENT`.
  - Email ton tai va role hien tai la `STUDENT` (hoac chua co role nao) → dung lai user id, gan/giu `Role.STUDENT`, khong bao loi.
  - Email ton tai va role hien tai **khac `STUDENT`** (TEACHER/MODERATOR/PRINCIPAL/IT_STAFF) → **chan** voi `409` — khong duoc ghi de role qua `replaceRole` vi day la he thong single-role.
  - Email ton tai nhung `status = DISABLED` → **chan** voi `409` — Teacher khong co quyen tu kich hoat lai tai khoan bi khoa (quyen do thuoc Moderator/Principal theo BR-03); khac voi `addTeacher` cho phep Moderator tu reactivate.
- **Enrollment rieng theo tung lop**: sau khi resolve/tao `AppUser`, kiem tra trung theo `class_members (class_id, student_id)` — khong phai theo email toan he thong. Mot hoc sinh co the o nhieu lop.
- **Notification tai dung ha tang co san, khong qua `NotificationService`**: `NotificationService` hien gan cung logic "Moderator broadcast theo subject" (bat buoc `moderatorSubject != null`), khong khop ngu canh 1-hoc-sinh. Add Student goi truc tiep `NotificationRepository.createWithRecipients(...)` + `NotificationStreamPort.publishNew(...)` (cung repository/gateway ma `NotificationService` dang dung), voi `subject = classroom.subject()`, `senderId = teacherId`, `recipientIds = [studentId]`.
- **Import theo hang, khong reject ca file** (BR-38): dong hop le duoc them, dong loi bi bo qua va bao cao ly do; chi rollback toan bo khi loi he thong (vd. transaction that bai giua chung), khong phai khi tung dong khong hop le.
- **Gioi han si so lop toi da 60 thanh vien** (khong tinh giao vien): rule bo sung theo yeu cau du an, **khong co trong SRS goc** (SRS chi co BR-34/37/38/46, khong de cap capacity) — ghi ro de tranh nham la business rule chinh thuc. Ap dung cho ca 2 endpoint ghi:
  - `POST /members`: neu lop da du 60 thanh vien → chan voi `409`, khong tao/sua ban ghi nao.
  - `POST /members/import`: them dong hop le cho **den khi du 60**, cac dong con lai (dung ra hop le nhung vuot si so) bi **skip** voi ly do `CLASS_FULL` — ap dung triet ly "bo qua dong loi, khong reject ca file" giong `BR-38`.
  - Kiem tra si so bang `ClassMemberRepository.countByClassId` hien co, **khong** can them cot/constraint moi trong DB — day la rule ap dung o tang service, khong phai DB constraint, de sau nay de doi so neu can ma khong can migration.
- **Dinh dang file import: chap nhan `.xlsx` va `.csv`**, cot bat buoc phai **dat ten la `gmail`** (khong phai `email` chung chung) — **khong phan biet hoa/thuong** (`gmail`, `Gmail`, `GMAIL` deu hop le). SRS chi ghi "required email column" chung chung; du an chot ten cot cu the la `gmail` de khop UI/template thuc te.
- **Rui ro schema co san (khong sua trong tai lieu nay)**: migration `V15__create_class_management.sql` tao `classes`/`class_members` bang `BIGSERIAL`/`teacher_id BIGINT REFERENCES users(id)`, trong khi `ClassEntity`/`ClassMemberEntity` (JPA) dung `UUID` + `owner_id`/`app_users`. `spring.jpa.hibernate.ddl-auto=update` dang che giau lech nay. Migration moi phuc vu Add Student phai theo dung schema UUID thuc te cua entity, khong theo V15 cu — xem chi tiet o [`../add-student/flow.md`](../add-student/flow.md#5-model-du-lieu-du-kien).

---

## Danh sach endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/classes/{id}/members` | Xem danh sach thanh vien (man Class Members, tien de cua UC-36) | TEACHER owner / enrolled STUDENT |
| 2 | POST | `/api/classes/{id}/members` | UC-36 Add Student (1 email) | TEACHER owner |
| 3 | POST | `/api/classes/{id}/members/import` | UC-36 Alt Flow — Import Students (CSV/Excel) | TEACHER owner |

Tat ca request can `Authorization: Bearer <access>` theo JWT filter cua `auth.md`.

---

## Data contract

### `ClassMemberDto`

```json
{
  "id": "uuid",
  "studentId": "uuid",
  "studentEmail": "student01@gmail.com",
  "studentName": "Nguyen Van B",
  "studentStatus": "INVITED",
  "joinedAt": "2026-07-25T10:00:00Z"
}
```

- `studentStatus`: `INVITED | ACTIVE` — phan anh `AppUser.status`, giup FE hien thi "chua dang nhap lan nao" vs "da kich hoat".

### `ClassMemberPageDto`

```json
{
  "items": [ ClassMemberDto ],
  "page": 0,
  "size": 20,
  "total": 42
}
```

### Request DTO

```json
AddStudentRequest: {
  "email": "student01@gmail.com"
}
```

```
ImportStudentsRequest (multipart/form-data):
  file: <.csv hoac .xlsx, cot bat buoc ten "gmail" (khong phan biet hoa/thuong)>
```

### `ImportStudentsResponse`

```json
{
  "addedCount": 27,
  "skippedCount": 3,
  "skipped": [
    { "row": 5, "email": "invalid-email", "reason": "INVALID_FORMAT" },
    { "row": 9, "email": "student02@gmail.com", "reason": "DUPLICATE_IN_FILE" },
    { "row": 14, "email": "student03@gmail.com", "reason": "ALREADY_ENROLLED" },
    { "row": 20, "email": "student09@gmail.com", "reason": "CLASS_FULL" }
  ]
}
```

- `reason`: `INVALID_FORMAT | DUPLICATE_IN_FILE | ALREADY_ENROLLED | ROLE_CONFLICT | ACCOUNT_DISABLED | CLASS_FULL`.
- `CLASS_FULL`: dong ban than hop le nhung lop da du 60 thanh vien tai thoi diem xu ly den dong do (dem ca cac dong da them thanh cong truoc do trong cung lan import).

---

## Chi tiet endpoint

### 1. `GET /api/classes/{id}/members` — Xem danh sach thanh vien

```http
query: ?page=0&size=20
→ 200  ClassMemberPageDto
→ 403  khong phai owner va khong phai enrolled student
→ 404  lop khong ton tai
```

- Dieu kien truy cap giong `GET /api/classes/{id}` trong `class-management.md`: owner hoac enrolled student, theo `BR-34`.
- Sap xep mac dinh theo `joinedAt` giam dan.
- Day la man hinh nen (Class Members screen) ma UC-36 yeu cau Teacher dang dung truoc khi Add Student (precondition trong SRS).

### 2. `POST /api/classes/{id}/members` — Them 1 hoc sinh bang Gmail (UC-36 Normal Flow)

```http
body: { email }
→ 201  ClassMemberDto
→ 400  thieu email (MSG02) / email sai dinh dang (MSG03)
→ 403  khong phai owner, hoac lop Inactive (MSG23)
→ 404  lop khong ton tai
→ 409  hoc sinh da enrolled trong lop nay / email thuoc role khac / tai khoan DISABLED / lop da du 60 thanh vien
```

- Chi class owner (Teacher) va chi khi lop `ACTIVE` (`BR-37`) moi duoc goi — chan truoc khi lam bat cu buoc nao khac.
- Validate email bat buoc + dung dinh dang (MSG02/MSG03) truoc khi resolve user.
- Kiem tra si so lop hien tai (`countByClassId`) **chua du 60** — neu da du, tra `409` ngay, khong tao/resolve `AppUser` nao (xem "Quyet dinh rieng").
- Resolve-or-create `AppUser` theo email (xem "Quyet dinh rieng" o tren): tao moi neu chua co, chan neu role khac `STUDENT` hoac tai khoan `DISABLED`.
- Kiem tra `class_members` chua co ban ghi `(classId, studentId)` — neu co, tra `409` va **khong** thay doi du lieu, dung nhu SRS "Step 7_Student is already enrolled".
- Ghi `class_members`, gan `Role.STUDENT` cho user (idempotent neu da la STUDENT), cap quyen truy cap Class Hub (`BR-06`).
- Gui notification "class-enrollment" cho hoc sinh vua them (`BR-46`) qua `NotificationRepository`/`NotificationStreamPort`.
- Hien MSG08 khi thanh cong.
- Map: `UC-36` Normal Flow, Exception "Class is Inactive" / "Email address is missing" / "Email format is invalid" / "Student is already enrolled".

### 3. `POST /api/classes/{id}/members/import` — Import hoc sinh tu file (UC-36 Alt Flow)

```http
multipart: file (.csv hoac .xlsx, cot bat buoc ten "gmail", khong phan biet hoa/thuong)
→ 200  ImportStudentsResponse
→ 400  file thieu / sai dinh dang / vuot gioi han / khong co cot "gmail" bat buoc (MSG24)
→ 403  khong phai owner, hoac lop Inactive (MSG23)
→ 404  lop khong ton tai
→ 502/500 loi he thong giua qua trinh ghi bulk → rollback toan bo (MSG25)
```

- Chi class owner va chi khi lop `ACTIVE` moi duoc goi, giong endpoint (2).
- Validate file: dinh dang (`.csv`/`.xlsx`), kich thuoc, **co cot ten dung la `gmail`** (khong phan biet hoa/thuong; file dung ten cot khac nhu `email` ma khong co cot `gmail` → coi la thieu cot bat buoc), co it nhat 1 dong du lieu — sai bat ky dieu kien nao tra `400` MSG24, **khong them ai** (SRS Exception "Imported file is invalid").
- Voi file hop le: duyet tung dong theo thu tu, phan loai `valid / invalid format / duplicate trong file / already enrolled / role conflict / account disabled / class full`.
- Them dong valid & khong trung **cho den khi lop du 60 thanh vien**; dong sau do bi skip voi ly do `CLASS_FULL` du ban than dong do hop le — ap dung cung triet ly "bo qua dong loi, khong reject ca file" (`BR-38`) cho ca truong hop vuot si so.
- Them tat ca dong valid & khong trung (trong gioi han si so), **bo qua** dong loi thay vi reject ca file (`BR-38`) — neu khong con dong valid nao, tra `200` voi `addedCount = 0` va danh sach ly do bi bo qua day du (SRS "Imported file contains no valid student rows"), **khong** phai loi.
- Neu qua trinh ghi bulk that bai vi loi he thong (khong phai loi validate tung dong) → rollback toan bo, khong hoc sinh nao duoc them, khong gui notification nao (SRS "Bulk addition fails", MSG25).
- Gui notification cho tung hoc sinh them thanh cong (`BR-46`).
- Tra `ImportStudentsResponse` la import summary hien thi so luong them/bo qua kem ly do.
- Map: `UC-36` Alternative Flow "Teacher imports students" + 3 exception flow lien quan file.

---

## Cross-cutting

- **RBAC**: `@PreAuthorize("hasRole('TEACHER')")` cho endpoint (2) va (3). Endpoint (1) dung `authenticated()`, owner/enrollment check trong service — giong pattern `GET /api/classes/{id}` cua `class-management.md`.
- **Owner-only + Active-only**: ca 3 endpoint deu check `class.ownerId == currentUserId`; endpoint ghi (2)(3) con phai check `class.status == ACTIVE` truoc khi lam bat ky thay doi nao (`BR-37`).
- **Single-role model**: he thong hien tai luu 1 role/user (`UserRoleRepository.replaceRole` ghi de). Add Student **khong duoc** tu dong ghi de role cua mot tai khoan da co role khac `STUDENT`.
- **Khong tu kich hoat tai khoan `DISABLED`**: chi Moderator/Principal moi co quyen reactivate (ngoai pham vi tai lieu nay).
- **Transaction**: them 1 email la 1 transaction; import file la 1 transaction bulk — that bai he thong thi rollback toan bo, that bai tung dong thi van commit cac dong hop le (khong dung transaction rollback cho loi validate tung dong).
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phu thuoc & thu tu build

1. Them `STUDENT` vao `Role` enum va `PRIORITY` list (uu tien thap nhat).
2. Sua/them migration cho `classes`/`class_members` dung schema UUID thuc te (doi chieu `ClassEntity`/`ClassMemberEntity`), khac phuc lech voi `V15__create_class_management.sql` cu.
3. Mo rong `ClassMemberRepository`: them `findByClassId` (phan trang), giu nguyen `save`/`countByClassId`/`existsByClassIdAndStudentId`.
4. Service moi `ClassEnrollmentService` (`service/classroom/`): resolve-or-create `AppUser`, gan `Role.STUDENT`, check da enrolled, ghi `ClassMember`, goi `NotificationRepository`/`NotificationStreamPort`; ham rieng cho luong import (parse file, phan loai dong, bulk insert).
5. DTO trong `presentation/dto/classroom/`: `AddStudentRequest`, `ClassMemberDto`, `ClassMemberPageDto`, `ImportStudentsResponse`.
6. Them 3 method vao `ClassController` hien co (cung resource `/api/classes/{id}`, khong tach controller rieng).
7. Exception mapping cho case moi (409 role-conflict / account-disabled / already-enrolled) — tai dung `DuplicateEmailException`/`ForbiddenOperationException` voi message rieng, hoac bo sung message cu the trong `GlobalExceptionHandler` neu can phan biet ro cho FE.
8. Smoke test qua Swagger: Teacher them 1 email moi, them email da enrolled, them email dang la Teacher khac, import file mau tron dong loi.

## Diem mo

- `UC-37 Remove Student` can tai lieu API design rieng, ke thua cung `ClassMemberRepository`.
- UI Class Members / Add Student / Import Students o FE (`fe/components/classroom/`) chua ton tai, se thiet ke sau khi API duoc chot.
- Gioi han **kich thuoc file** va **so dong toi da** cho import (rieng voi gioi han si so 60 thanh vien/lop da chot o tren) — can Product xac nhan truoc khi code, tam thoi de xuat theo mau `POST /api/uploads` hien co (`api-chung.md`: toi da 10MB) neu khong co huong dan khac.
- Kha nang mot tai khoan vua la Teacher vua la Student (multi-role thuc su) — ngoai pham vi SRS hien tai, hien tai chan cung boi quyet dinh "role conflict" o tren.
