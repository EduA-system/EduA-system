# Integration Test XLSX And Code Plan

Mục tiêu: dùng file này làm checklist triển khai tài liệu Excel và code integration test cho các sheet trong `Report5.2_Integration Test.xlsx`.

Workbook cần cập nhật:

`G:\.shortcut-targets-by-id\1c_y2P_yZ_gA3rn0pPGsXgvJ9CIoQaTm8\SEP490_SU26_G20\Tài liệu thực tế (đây là thư mục gốc, sửa các file ở đây)\test\Report5.2_Integration Test.xlsx`

Nguồn task:

`D:\doan_real\EduA-system\resource\intergration-test\integration-test-feature-list.md`

Phạm vi loại trừ:

- Không test chức năng dùng AI để sinh nội dung.
- Không test mô phỏng Lý-Hóa.
- Không test các flow edit/export mà tiền đề bắt buộc là nội dung sinh bởi AI.
- Không test dashboard còn planned/pending.

## Quy Trình Chuẩn Cho Mỗi Sheet

Làm từng sheet theo đúng thứ tự này:

1. Đọc code FE/BE của feature.
2. Viết/cập nhật sheet trong Excel theo layout hiện tại của workbook.
3. Mỗi test case phải có procedure dạng manual/tester-friendly:
   - Login bằng role tương ứng.
   - Mở màn hình hoặc route.
   - Click tab/button/form thật trên UI nếu có.
   - API chỉ ghi ở cột `Note`.
4. Viết code integration test ở backend:
   - Dùng `@SpringBootTest`.
   - Dùng `@AutoConfigureMockMvc`.
   - Gọi HTTP endpoint bằng `MockMvc`.
   - Dùng Bearer JWT thật qua `TokenService.issueAccessToken`.
   - Seed data qua repository/JdbcTemplate.
   - Assert cả HTTP response và DB state.
5. Chạy riêng test class của sheet.
6. Nếu pass thì cập nhật lại Excel:
   - `Round 1` = `Passed`.
   - `Test date` = ngày chạy test.
   - `Tester` = `HiệpVT`.
   - Giữ dropdown `Passed/Failed/Pending/N/A`.
7. Cập nhật `Test Cases`:
   - Function Name.
   - Sheet Name.
   - Description.
   - Pre-condition/kết quả Round 1 nếu đã chạy.
8. Cập nhật `Test Statistics`:
   - Link số liệu về sheet feature.
   - Kiểm tra số test case, passed, failed, pending.

## Quy Ước Code Test

Package:

`be/src/test/java/com/edua/beeduasystem/integration`

Tên class:

`<FeatureName>IntegrationTests.java`

Tên method:

`IT_<SHEET_CODE>_<NUMBER>_<shortBehavior>()`

Ví dụ đã làm:

`IT_UM_002_principalCreatesModerator()`

Không dùng `@WithMockUser` cho các case cần service lấy current user, vì `CurrentUserProvider` đọc principal kiểu `AccessTokenClaims`. Dùng JWT thật:

```java
private String bearer(AppUser user, Role role) {
    return "Bearer " + tokenService.issueAccessToken(user, Set.of(role));
}
```

## Quy Ước Database Test

Không chạy test bằng cách xoá dữ liệu schema thật `edua2`.

Ưu tiên:

- Dùng schema test riêng theo feature.
- Dữ liệu test dùng email domain riêng, ví dụ `@integration-test.edua.local`.
- Cleanup theo prefix/domain test, không `TRUNCATE` toàn bộ schema thật.

Schema test đã dùng cho User Management:

`edua_user_management_it`

Lệnh chạy PowerShell cho User Management:

```powershell
cd D:\doan_real\EduA-system\be
$envs = Get-Content ..\.env | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' }; foreach ($line in $envs) { $idx = $line.IndexOf('='); [Environment]::SetEnvironmentVariable($line.Substring(0,$idx), $line.Substring($idx+1), 'Process') }
$env:IT_DB_URL = $env:DB_URL.Replace('currentSchema=edua2','currentSchema=edua_user_management_it')
$env:IT_FLYWAY_ENABLED = 'false'
.\mvnw.cmd '-Dtest=UserManagementIntegrationTests' test
```

Expected:

```text
Tests run: 18, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

## Trạng Thái Tổng Quan

| No | Sheet/Tab | Sheet Code | Code Test Class | Excel Status | Code Status | Round 1 |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Authentication & Profile | AP | `AuthenticationProfileIntegrationTests` | Pending | Pending | Pending |
| 2 | Role-Based Access Control | RBAC | `RoleBasedAccessControlIntegrationTests` | Pending | Pending | Pending |
| 3 | User Management CRUD | UM | `UserManagementIntegrationTests` | Done | Done | Passed 18/18 |
| 4 | Personal Library CRUD | PL | `PersonalLibraryIntegrationTests` | Pending | Pending | Pending |
| 5 | Community Hub Content | HC | `CommunityHubContentIntegrationTests` | Pending | Pending | Pending |
| 6 | Community Hub Feedback | HF | `CommunityHubFeedbackIntegrationTests` | Pending | Pending | Pending |
| 7 | Hub Moderation | HM | `HubModerationIntegrationTests` | Pending | Pending | Pending |
| 8 | Blog CRUD & Moderation | BL | `BlogIntegrationTests` | Pending | Pending | Pending |
| 9 | Notification Management | NM | `NotificationManagementIntegrationTests` | Pending | Pending | Pending |
| 10 | Activity Log | AL | `ActivityLogIntegrationTests` | Pending | Pending | Pending |
| 11 | Classroom CRUD | CC | `ClassroomCrudIntegrationTests` | Pending | Pending | Pending |
| 12 | Classroom Membership | CM | `ClassroomMembershipIntegrationTests` | Pending | Pending | Pending |
| 13 | Classroom Resource CRUD | CR | `ClassroomResourceIntegrationTests` | Pending | Pending | Pending |
| 14 | Assignment Submission | AS | `AssignmentSubmissionIntegrationTests` | Pending | Pending | Pending |
| 15 | Submission Review | SR | `SubmissionReviewIntegrationTests` | Pending | Pending | Pending |
| 16 | Weekly Task / Lesson Plan Approval | WT | `WeeklyTaskIntegrationTests` | Pending | Pending | Pending |

## Detailed Backlog

### 1. Authentication & Profile

Suggested sheet name: `Authentication & Profile`

Suggested test class: `AuthenticationProfileIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-AP-001 | Login with Google SSO | Allowed user | `POST /api/auth/google` | Auth controller, Google verifier mock, JWT issue, refresh cookie |
| IT-AP-002 | Login denied for non-allowlisted email | Guest | `POST /api/auth/google` | Email allowlist rejection |
| IT-AP-003 | Refresh session | Authenticated user | `POST /api/auth/refresh` | Refresh token validation and new access token |
| IT-AP-004 | Logout | Authenticated user | `POST /api/auth/logout` | Refresh token/cookie revoke |
| IT-AP-005 | View current user | Authenticated user | `GET /api/auth/me` | JWT principal to current user DTO |
| IT-AP-006 | Update profile | Authenticated user | `PATCH /api/users/me` | Profile update and validation |

### 2. Role-Based Access Control

Suggested sheet name: `Role-Based Access Control`

Suggested test class: `RoleBasedAccessControlIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-RBAC-001 | Teacher accesses teacher APIs | Teacher | selected Teacher APIs | 200 for allowed role |
| IT-RBAC-002 | Moderator accesses moderation APIs | Moderator | selected Moderator APIs | 200 for allowed role |
| IT-RBAC-003 | Principal accesses principal APIs | Principal | `/api/principal/**` | 200 for allowed role |
| IT-RBAC-004 | IT Staff accesses activity log | IT Staff | `/api/it-staff/activity-log` | 200 for IT Staff |
| IT-RBAC-005 | Unauthorized user denied | Teacher/Student/Guest | protected APIs | 401/403 |

### 3. User Management CRUD

Suggested sheet name: `User Management`

Suggested test class: `UserManagementIntegrationTests`

Status: Done.

Code file:

`D:\doan_real\EduA-system\be\src\test\java\com\edua\beeduasystem\integration\UserManagementIntegrationTests.java`

Round 1 result in Excel:

- 18 test cases.
- `Passed`.
- Test date: `2026-07-30`.
- Tester: `HiệpVT`.

Test cases implemented:

| ID | Function | Role | API |
| --- | --- | --- | --- |
| IT-UM-001 | View Moderator list | Principal | `GET /api/principal/moderators` |
| IT-UM-002 | Create Moderator | Principal | `POST /api/principal/moderators` |
| IT-UM-003 | Reject duplicate active Moderator subject | Principal | `POST /api/principal/moderators` |
| IT-UM-004 | Reject duplicate active email for Moderator | Principal | `POST /api/principal/moderators` |
| IT-UM-005 | Replace Moderator | Principal | `POST /api/principal/moderators/{id}/replacement` |
| IT-UM-006 | Reject invalid replacement | Principal | `POST /api/principal/moderators/{id}/replacement` |
| IT-UM-007 | Reactivate Moderator | Principal | `PATCH /api/principal/moderators/{id}/reactivate` |
| IT-UM-008 | View IT Staff list | Principal | `GET /api/principal/it-staff` |
| IT-UM-009 | Create IT Staff | Principal | `POST /api/principal/it-staff` |
| IT-UM-010 | Reject duplicate active email for IT Staff | Principal | `POST /api/principal/it-staff` |
| IT-UM-011 | Revoke IT Staff | Principal | `DELETE /api/principal/it-staff/{id}` |
| IT-UM-012 | Reactivate IT Staff | Principal | `PATCH /api/principal/it-staff/{id}/reactivate` |
| IT-UM-013 | View same-subject Teacher list | Moderator | `GET /api/moderator/teachers` |
| IT-UM-014 | Create Teacher | Moderator | `POST /api/moderator/teachers` |
| IT-UM-015 | Reject duplicate active email for Teacher | Moderator | `POST /api/moderator/teachers` |
| IT-UM-016 | Revoke Teacher | Moderator | `DELETE /api/moderator/teachers/{id}` |
| IT-UM-017 | Reactivate Teacher | Moderator | `PATCH /api/moderator/teachers/{id}/reactivate` |
| IT-UM-018 | Deny unauthorized roles | Teacher/IT Staff/Student/Principal/Moderator mismatch | `/api/principal/**`, `/api/moderator/**` |

### 4. Personal Library CRUD

Suggested sheet name: `Personal Library CRUD`

Suggested test class: `PersonalLibraryIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-PL-001 | List own content | Teacher/Moderator | `GET /api/library/contents` | Owner-scoped listing |
| IT-PL-002 | Open content detail | Teacher/Moderator | `GET /api/library/contents/{id}` | Owner can view detail |
| IT-PL-003 | Create library content | Teacher/Moderator | `POST /api/library/contents` | Non-AI payload save |
| IT-PL-004 | Rename/update content | Teacher/Moderator | `PATCH /api/library/contents/{id}` | Update title/subject/payload |
| IT-PL-005 | Delete content | Teacher/Moderator | `DELETE /api/library/contents/{id}` | Soft delete |
| IT-PL-006 | Submit for review | Teacher/Moderator | `POST /api/library/contents/{id}/submission` | PRIVATE/REJECTED to SUBMITTED |
| IT-PL-007 | Unsubmit | Teacher/Moderator | `DELETE /api/library/contents/{id}/submission` | SUBMITTED to PRIVATE |
| IT-PL-008 | Owner isolation | Teacher/Moderator | library APIs | 403/404 for other owner's content |

### 5. Community Hub Content

Suggested sheet name: `Community Hub Content`

Suggested test class: `CommunityHubContentIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-HC-001 | View approved Hub feed | Guest/All | `GET /api/hub/contents` | Only approved content returned |
| IT-HC-002 | View approved content detail | Guest/All | `GET /api/hub/contents/{id}` | Public detail for approved content |
| IT-HC-003 | Customize Hub content | Teacher | `POST /api/hub/contents/{id}/customize` | Copy approved content into private library |
| IT-HC-004 | Deny customize for invalid role | Guest/Student/etc. | `POST /api/hub/contents/{id}/customize` | 401/403 |

### 6. Community Hub Feedback

Suggested sheet name: `Community Hub Feedback`

Suggested test class: `CommunityHubFeedbackIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-HF-001 | Create comment | Teacher/Moderator | `POST /api/hub/contents/{id}/comments` | Comment created |
| IT-HF-002 | Update own comment | Teacher/Moderator owner | `PATCH /api/hub/comments/{commentId}` | Owner update |
| IT-HF-003 | Delete own comment | Teacher/Moderator owner | `DELETE /api/hub/comments/{commentId}` | Owner delete |
| IT-HF-004 | Content owner deletes comment | Content owner | `DELETE /api/hub/comments/{commentId}` | Owner of content can delete |
| IT-HF-005 | Report content | Teacher/Moderator | `POST /api/hub/contents/{id}/reports` | Report record created |
| IT-HF-006 | Permission denial | Guest/Other user | feedback APIs | 401/403 |

### 7. Hub Moderation

Suggested sheet name: `Hub Moderation`

Suggested test class: `HubModerationIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-HM-001 | View moderation queue | Moderator | `GET /api/library/contents/moderation-queue` | Submitted content only |
| IT-HM-002 | Approve content | Moderator | `POST /api/library/contents/{id}/approval` | Status APPROVED |
| IT-HM-003 | Reject content | Moderator | `POST /api/library/contents/{id}/rejection` | Status REJECTED with reason |
| IT-HM-004 | Permission denial | Teacher/Principal/Guest | moderation APIs | 401/403 |

### 8. Blog CRUD & Moderation

Suggested sheet name: `Blog CRUD & Moderation`

Suggested test class: `BlogIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-BL-001 | View blog list | Authenticated user | `GET /api/blog-posts` | Published list |
| IT-BL-002 | View blog detail | Authenticated user | `GET /api/blog-posts/{id}` | Published detail |
| IT-BL-003 | Create blog post | Teacher | `POST /api/blog-posts` | Post created/sanitized |
| IT-BL-004 | Edit own post | Teacher owner | `PATCH /api/blog-posts/{id}` | Owner update |
| IT-BL-005 | Delete own post | Teacher owner | `DELETE /api/blog-posts/{id}` | Soft delete |
| IT-BL-006 | Create comment | Teacher | `POST /api/blog-posts/{id}/comments` | Comment created |
| IT-BL-007 | Update own comment | Teacher owner | `PATCH /api/blog-comments/{commentId}` | Owner update |
| IT-BL-008 | Delete own comment | Teacher owner | `DELETE /api/blog-comments/{commentId}` | Owner delete |
| IT-BL-009 | View moderation list | Moderator | `/blog/moderation` / API | Moderation list |
| IT-BL-010 | Remove post | Moderator | `POST /api/blog-posts/{id}/removal` | Removed with reason |
| IT-BL-011 | Permission denial | Invalid role/non-owner | blog APIs | 403/404 |

### 9. Notification Management

Suggested sheet name: `Notification Management`

Suggested test class: `NotificationManagementIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-NM-001 | Create notification | Moderator | `POST /api/notifications` | Broadcast by subject |
| IT-NM-002 | View my notifications | Authenticated user | `GET /api/notifications` | Recipient-scoped list |
| IT-NM-003 | View unread count | Authenticated user | `GET /api/notifications/unread-count` | Count unread |
| IT-NM-004 | Mark one read | Authenticated user | `PATCH /api/notifications/{id}/read` | Recipient only |
| IT-NM-005 | Mark all read | Authenticated user | `POST /api/notifications/read-all` | All own unread |
| IT-NM-006 | Permission denial on create | Teacher/Student/Principal | `POST /api/notifications` | 403 |

### 10. Activity Log

Suggested sheet name: `Activity Log`

Suggested test class: `ActivityLogIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-AL-001 | View activity log | IT Staff | `GET /api/it-staff/activity-log` | IT Staff-only list |
| IT-AL-002 | Filter by action/category/user/date | IT Staff | `GET /api/it-staff/activity-log?...` | Query filters |
| IT-AL-003 | Permission denial | Non-IT Staff | activity log API | 403 |

### 11. Classroom CRUD

Suggested sheet name: `Classroom CRUD`

Suggested test class: `ClassroomCrudIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-CC-001 | Create class | Teacher/Moderator | `POST /api/classes` | ACTIVE class owned by current user |
| IT-CC-002 | List owned classes | Teacher/Moderator | `GET /api/classes` | Owner-scoped/filter list |
| IT-CC-003 | View class detail | Owner/Enrolled student | `GET /api/classes/{id}` | Allowed viewer |
| IT-CC-004 | Update class info | Owner | `PATCH /api/classes/{id}` | Name/subject/grade/description |
| IT-CC-005 | Activate/deactivate class | Owner | `PATCH /api/classes/{id}/status` | Status transition |
| IT-CC-006 | Permission denial | Stranger/invalid role | class APIs | 403/404 |

### 12. Classroom Membership

Suggested sheet name: `Classroom Membership`

Suggested test class: `ClassroomMembershipIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-CM-001 | Add student by Gmail | Teacher/Moderator owner | `POST /api/classes/{id}/members` | Student user/member created |
| IT-CM-002 | Import students | Teacher/Moderator owner | `POST /api/classes/{id}/members/import` | CSV/XLSX valid and invalid rows |
| IT-CM-003 | List class members | Owner/Enrolled student | `GET /api/classes/{id}/members` | Member roster |
| IT-CM-004 | Student list enrolled classes | Student | `GET /api/classes/enrolled` | Student-specific classes |
| IT-CM-005 | Prevent duplicate enrollment | Owner | member APIs | Conflict/duplicate handling |
| IT-CM-006 | Permission denial | Stranger/invalid role | member APIs | 403/404 |

### 13. Classroom Resource CRUD

Suggested sheet name: `Classroom Resource CRUD`

Suggested test class: `ClassroomResourceIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-CR-001 | Post resource | Teacher/Moderator owner | `POST /api/classes/{id}/resources` | Resource created |
| IT-CR-002 | List resources | Owner/Enrolled student | `GET /api/classes/{id}/resources` | Class resource list |
| IT-CR-003 | View resource detail | Owner/Enrolled student | resource detail API | Allowed detail |
| IT-CR-004 | Update resource | Owner | `PATCH /api/classes/{id}/resources/{resourceId}` | Title/description/deadline |
| IT-CR-005 | Delete resource | Owner | `DELETE /api/classes/{id}/resources/{resourceId}` | Resource removed |
| IT-CR-006 | Permission denial | Student/Stranger | resource write APIs | 403/404 |

### 14. Assignment Submission

Suggested sheet name: `Assignment Submission`

Suggested test class: `AssignmentSubmissionIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-AS-001 | Submit assignment | Enrolled student | `POST /api/classes/{id}/resources/{resourceId}/submission` | Submission created |
| IT-AS-002 | View own submission | Enrolled student | `GET /api/classes/{id}/resources/{resourceId}/submission` | Own submission detail |
| IT-AS-003 | Unsubmit assignment | Enrolled student | `DELETE /api/classes/{id}/resources/{resourceId}/submission` | Submission withdrawn |
| IT-AS-004 | Submit after deadline | Enrolled student | submission API | Late/deadline behavior |
| IT-AS-005 | Permission denial | Non-enrolled/teacher | submission APIs | 403/404 |

### 15. Submission Review

Suggested sheet name: `Submission Review`

Suggested test class: `SubmissionReviewIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-SR-001 | View submission roster | Teacher/Moderator owner | `GET /api/classes/{id}/resources/{resourceId}/submissions` | Roster with statuses |
| IT-SR-002 | View student submission detail | Teacher/Moderator owner | `GET /api/classes/{id}/resources/{resourceId}/submissions/{studentId}` | Detail with files/status |
| IT-SR-003 | Permission denial | Student/Stranger | review APIs | 403/404 |

### 16. Weekly Task / Lesson Plan Approval

Suggested sheet name: `Weekly Task`

Suggested test class: `WeeklyTaskIntegrationTests`

Test cases:

| ID | Function | Role | Screen/API | Code Coverage Target |
| --- | --- | --- | --- | --- |
| IT-WT-001 | View weekly schedule | Teacher/Moderator | `GET /api/weekly-tasks` | Teacher own tasks, Moderator managed queue |
| IT-WT-002 | Create weekly task | Moderator | `POST /api/weekly-tasks` | Task assigned to teacher |
| IT-WT-003 | Bulk create weekly tasks | Moderator | `POST /api/weekly-tasks/bulk` | Multiple tasks created |
| IT-WT-004 | Update weekly task | Moderator | `PATCH /api/weekly-tasks/{id}` | Scope/deadline update |
| IT-WT-005 | Teacher submit lesson plan | Teacher | `POST /api/weekly-tasks/{id}/submission` | Submit existing lesson/file fixture only |
| IT-WT-006 | Teacher unsubmit lesson plan | Teacher | `DELETE /api/weekly-tasks/{id}/submission` | Withdraw before review/lock |
| IT-WT-007 | View lesson approval queue | Moderator | `GET /api/weekly-tasks/moderation-queue` | Submitted tasks |
| IT-WT-008 | Approve lesson plan | Moderator | `POST /api/weekly-tasks/{id}/approval` | Status APPROVED |
| IT-WT-009 | Reject lesson plan | Moderator | `POST /api/weekly-tasks/{id}/rejection` | Status REJECTED with reason |
| IT-WT-010 | Permission/deadline denial | Teacher/Moderator | weekly task APIs | Wrong role/owner/deadline lock |

## Thứ Tự Làm Đề Xuất

Ưu tiên các feature CRUD ít phụ thuộc trước:

1. `Authentication & Profile`
2. `Role-Based Access Control`
3. `Activity Log`
4. `Notification Management`
5. `Personal Library CRUD`
6. `Hub Moderation`
7. `Community Hub Content`
8. `Community Hub Feedback`
9. `Blog CRUD & Moderation`
10. `Classroom CRUD`
11. `Classroom Membership`
12. `Classroom Resource CRUD`
13. `Assignment Submission`
14. `Submission Review`
15. `Weekly Task / Lesson Plan Approval`

`User Management CRUD` đã hoàn thành và dùng làm mẫu chuẩn cho các sheet tiếp theo.
