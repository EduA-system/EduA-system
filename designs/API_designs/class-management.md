# Class Management — API Design

> Endpoint dac thu chuc nang **Class Management**: Teacher tao lop, xem danh sach/chi tiet lop, cap nhat thong tin lop, va chuyen lop sang trang thai Inactive nhu soft-delete/read-only.
> Luong & thiet ke trien khai BE: [`../class-management/flow.md`](../class-management/flow.md).
> Ha tang dung chung auth/RBAC/rate-limit theo [`api-chung.md`](./api-chung.md).

## Quyet dinh rieng

- **Bam sat SRS**: mapping truc tiep `UC-29 View Class List`, `UC-30 Create Class`, `UC-31 Edit Class Information`, `UC-32 Set Class Status`, `UC-33 View Class Detail`.
- **Teacher-owned class**: Teacher tao lop se la owner cua lop; chi owner moi duoc quan ly thong tin, trang thai, membership va resource cua lop theo `BR-34`.
- **Class Hub kieu Google Classroom**: chi tiet lop la hub tap trung thong tin lop, thanh vien, tai nguyen, assignment va submission summary. Khong them self-join bang class code vi SRS hien chi mo ta Teacher add/import Student o use case rieng.
- **Soft-delete bang Inactive**: khong xoa vat ly lop trong CRUD nay. Deactivate la doi `status = INACTIVE`; lop thanh read-only theo `BR-37`.
- **Du lieu cu duoc giu lai**: khi lop Inactive, resource va submission hien co van view/download duoc boi owner va enrolled students theo `BR-39`.
- **Tach ranh gioi**: Add/Remove Student va Class Resource CRUD thuoc nhom API rieng, chi duoc reference trong Class Hub summary.

---

## Danh sach endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/classes` | UC-29 View Class List | TEACHER |
| 2 | POST | `/api/classes` | UC-30 Create Class | TEACHER |
| 3 | GET | `/api/classes/{id}` | UC-33 View Class Detail | TEACHER owner / enrolled STUDENT |
| 4 | PATCH | `/api/classes/{id}` | UC-31 Edit Class Information | TEACHER owner |
| 5 | PATCH | `/api/classes/{id}/status` | UC-32 Set Class Status | TEACHER owner |

Tat ca request can `Authorization: Bearer <access>` theo JWT filter cua `auth.md`.

---

## Data contract

### `ClassSummaryDto`

```json
{
  "id": "uuid",
  "name": "10A1 - Chemistry",
  "subject": "CHEMISTRY",
  "grade": 10,
  "memberCount": 42,
  "status": "ACTIVE",
  "createdAt": "2026-07-24T15:00:00Z",
  "updatedAt": "2026-07-24T15:00:00Z"
}
```

### `ClassDetailDto`

```json
{
  "id": "uuid",
  "name": "10A1 - Chemistry",
  "description": "Lop Hoa hoc 10A1",
  "subject": "CHEMISTRY",
  "grade": 10,
  "status": "ACTIVE",
  "ownerId": "uuid",
  "ownerName": "Nguyen Van A",
  "memberCount": 42,
  "resourceCount": 8,
  "assignmentCount": 3,
  "submissionCount": 75,
  "createdAt": "2026-07-24T15:00:00Z",
  "updatedAt": "2026-07-24T15:00:00Z"
}
```

### Request DTO

```json
CreateClassRequest: {
  "name": "10A1 - Chemistry",
  "subject": "CHEMISTRY",
  "grade": 10,
  "description": "Lop Hoa hoc 10A1"
}

UpdateClassRequest: {
  "name": "10A1 - Chemistry",
  "subject": "CHEMISTRY",
  "grade": 10,
  "description": "Lop Hoa hoc 10A1"
}

UpdateClassStatusRequest: {
  "status": "INACTIVE"
}
```

- `subject`: `MATH | PHYSICS | CHEMISTRY`.
- `grade`: `10 | 11 | 12`.
- `description` la tuy chon.
- `status`: `ACTIVE | INACTIVE`.

---

## Chi tiet endpoint

### 1. `GET /api/classes` — Xem danh sach lop so huu

```http
query: ?q=<keyword>
       ?subject=MATH|PHYSICS|CHEMISTRY
       ?grade=10|11|12
       ?status=ACTIVE|INACTIVE
       ?page=0&size=20
→ 200  { items: [ ClassSummaryDto ], page, size, totalElements }
→ 403  role != TEACHER
```

- Chi tra cac lop co `ownerId = currentUserId` theo `BR-34`.
- Sap xep mac dinh theo `updatedAt` giam dan.
- Moi item hien thi thong tin chinh: ten, mon, si so, trang thai Active/Inactive.
- Search/filter khong lam thay doi du lieu.
- Map: `UC-29`.

### 2. `POST /api/classes` — Tao lop

```http
body: { name, subject, grade, description? }
→ 201  ClassDetailDto
→ 400  thieu truong bat buoc / subject khong hop le / grade khong hop le
→ 403  role != TEACHER
```

- `ownerId = currentUserId`.
- Lop moi luon duoc tao voi `status = ACTIVE`.
- Sau khi tao, member area va resource area san sang cho Class Hub.
- Khong them hoc sinh trong endpoint nay; enrollment thuoc use case Add Student/Import Student.
- Map: `UC-30`.

### 3. `GET /api/classes/{id}` — Xem Class Hub

```http
→ 200  ClassDetailDto
→ 403  khong phai owner va khong phai enrolled student
→ 404  lop khong ton tai
```

- He thong chi cho truy cap neu user la owner hoac enrolled student theo `BR-34`.
- Response tra thong tin tong quan cua Class Hub: class info, member count, resource count, assignment count, submission count.
- Action kha dung tren FE phu thuoc role va status:
  - Owner + `ACTIVE`: co the edit, set status, manage members/resources.
  - Owner + `INACTIVE`: chi doc/view/download du lieu cu.
  - Student enrolled: chi xem noi dung duoc phep; khi `INACTIVE` thi read-only theo `BR-39`.
- Map: `UC-33`.

### 4. `PATCH /api/classes/{id}` — Cap nhat thong tin lop

```http
body: { name?, subject?, grade?, description? }
→ 200  ClassDetailDto
→ 400  field khong hop le
→ 403  khong phai owner, hoac lop Inactive
→ 404  lop khong ton tai
```

- Chi class owner moi duoc cap nhat theo `BR-34`.
- Chi cho cap nhat khi `status = ACTIVE` theo `BR-37`.
- Cho cap nhat cac field SRS cho phep: name, description, subject, grade.
- Khong lam thay doi members, resources, assignments, submissions.
- Map: `UC-31`.

### 5. `PATCH /api/classes/{id}/status` — Doi trang thai lop

```http
body: { status }
→ 200  ClassDetailDto
→ 400  status khong hop le / status trung trang thai hien tai
→ 403  khong phai owner
→ 404  lop khong ton tai
```

- Chi class owner moi duoc doi status theo `BR-34`.
- `ACTIVE -> INACTIVE`: deactivate lop, xem nhu soft-delete/read-only.
- `INACTIVE -> ACTIVE`: reactivate lop, mo lai cac thao tac day hoc binh thuong.
- Khi Inactive, he thong chan tao/sua/xoa resource, thay doi membership, submit va unsubmit theo `BR-37`.
- Du lieu cu van view/download duoc theo `BR-39`.
- Map: `UC-32`.

---

## Cross-cutting

- **RBAC**: `@PreAuthorize("hasRole('TEACHER')")` cho list/create/update/status. Detail dung `authenticated()` va service check owner/enrollment.
- **Owner-only**: service so `class.ownerId` voi `currentUserId` cho cac thao tac quan ly.
- **Participant access**: detail chi cho owner hoac enrolled student theo `BR-34`.
- **Inactive read-only**: service phai chan moi write action lien quan den class khi `status = INACTIVE`, tru endpoint reactivate.
- **Khong hard delete**: CRUD nay khong co `DELETE /api/classes/{id}` de tranh lech SRS. Neu can xoa vat ly sau nay, tach thanh use case rieng vi `BR-45` noi xoa class se xoa resource/submission.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phu thuoc & thu tu build

1. Flyway migration tao bang `classes` va status enum dang string.
2. Domain model `Classroom`, `ClassStatus`; reuse `Subject`.
3. Repository interface `ClassRepository` va persistence adapter JPA.
4. Service `ClassManagementService` xu ly owner-check, participant access, Active/Inactive rules.
5. DTO request/response trong `presentation/dto/classroom`.
6. Controller `ClassController` voi 5 endpoint tren.
7. Global exception mapping cho not found, access denied, validation va inactive/read-only.
8. Smoke test qua Swagger voi Teacher owner va Student enrolled.

## Diem mo

- Add/Remove Student, Import Student va Class Resource CRUD se can API design rieng cho `UC-36` den `UC-40`.
- Notification khi add student hoac post resource thuoc cac use case enrollment/resource, khong nam trong CRUD class.
- Class code/self-join giong Google Classroom khong dua vao phase nay vi SRS chua yeu cau.
