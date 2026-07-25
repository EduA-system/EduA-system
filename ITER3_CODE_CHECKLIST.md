# Iteration 3 Code Checklist

Source: `(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS`, planned `Iteration 3`.

Legend:
- `[x] Coded`: có frontend + backend hoặc logic chính đã có trong code.
- `[~] Partial`: có một phần liên quan, nhưng chưa đủ theo scope WBS.
- `[ ] Not found`: chưa thấy module/API/UI tương ứng trong code hiện tại.

## Summary

| Code reality | Count |
| --- | ---: |
| Coded | 16 |
| Partial | 0 |
| Not found | 11 |

## Checklist

| Done | WBS item | Feature | WBS status | Code reality | Evidence / note |
| --- | --- | --- | --- | --- | --- |
| [x] | Submit / Unsubmit Hub Content for Review | Community Hub | Pending | Coded | Backend `POST/DELETE /api/library/contents/{id}/submission` (`LibraryContentController.java`, `LibraryContentService.submit/unsubmit`); `LibraryContentStatus` nay có `PRIVATE`/`SUBMITTED`/`APPROVED`/`REJECTED`; `submit()` chấp nhận cả `REJECTED` để gửi lại. Frontend nút "Gửi duyệt"/"Thu hồi"/"Gửi lại" ở `/library`. |
| [x] | View Community Hub | Community Hub | Pending | Coded | Backend `GET /api/hub/contents` (`HubContentController`, `HubContentService.list`) — chỉ trả content `APPROVED`, không owner filter. Frontend `/community-hub` (`CommunityHubPage.tsx`), sidebar đã trỏ đúng thay vì `/homepage`. |
| [x] | View Public Hub Content Detail (Guest preview) | Community Hub | Pending | Coded | Backend `GET /api/hub/contents/{id}` không yêu cầu auth (`SecurityConfig`: `GET /api/hub/contents/**` permitAll); trả 404 nếu content chưa `APPROVED`. Frontend detail modal trong `/community-hub` xem được khi chưa đăng nhập. |
| [x] | Customize Hub Content | Community Hub | Pending | Coded | Backend `POST /api/hub/contents/{id}/customize` (`HubContentService.customize`) — copy payload/type/subject thành `LibraryContent` mới, owner = user hiện tại, status `PRIVATE`. Yêu cầu role TEACHER. Frontend nút "Tùy biến về thư viện của tôi". |
| [x] | View & Create Content Comments | Community Hub | Pending | Coded | Bảng `hub_content_comments` (`V20__create_hub_comments_and_reports.sql`); backend `POST /api/hub/contents/{id}/comments` (`HubCommentService.create`, chỉ trên content `APPROVED`); frontend hiển thị + form bình luận trong detail modal. |
| [x] | Update / Delete Own Comment | Community Hub | Pending | Coded | Backend `PATCH/DELETE /api/hub/comments/{commentId}` (`HubCommentService.update/delete`, owner-only cho update). |
| [x] | Delete Comment on Own Content | Community Hub | Pending | Coded | `HubCommentService.delete` cho phép xóa nếu là tác giả comment HOẶC chủ sở hữu content (1 rule dùng chung với "Update/Delete Own Comment"). Frontend hiện nút Xóa tương ứng. |
| [x] | Report Violating Content | Community Hub | Pending | Coded | Bảng `hub_content_reports`; backend `POST /api/hub/contents/{id}/reports` (`HubContentReportService.create`) — chỉ ghi nhận báo cáo, WBS không định nghĩa UC cho luồng xử lý/review nên chưa có màn hình duyệt report. Frontend nút "Báo cáo vi phạm". |
| [x] | Moderator Account Management | User & Content Management | Pending | Coded | Backend `/api/principal/moderators` (`PrincipalController.java`); frontend `/user-management`. Role contract hiện là `PRINCIPAL`. |
| [x] | Teacher Account Management | User & Content Management | Pending | Coded | Backend `/api/moderator/teachers`; frontend `/user-management`. |
| [x] | Create Notifications (send to subject teachers) | User & Content Management | Pending | Coded | Backend `POST /api/notifications` (`NotificationController.java`, `NotificationService.create`) — Moderator broadcast tới Teacher cùng subject, fan-out `notifications`/`notification_recipients` (`V17__create_notifications.sql`) + push STOMP `/user/queue/notifications`. Frontend: form "Soạn thông báo" ở `/notifications` (chỉ hiện cho MODERATOR). Spec: `designs/API_designs/notifications.md`. |
| [x] | View & Manage My Notifications | User & Content Management | Pending | Coded | Backend `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `POST /read-all`. Frontend `fe/app/notifications/page.tsx` (list, filter unread, mark read/read-all) + badge chưa đọc realtime trên `Sidebar`. |
| [ ] | View & Filter Activity Log | User & Content Management | Pending | Not found | Có metadata `granted_by/granted_at` cho role assignment, nhưng chưa có audit/activity log module hoặc screen. Owner đã đổi: `IT Staff` (IT Manager) xem/duyệt log, không phải Mod/Principal như mô tả WBS ban đầu — xem Follow-Up Notes. |
| [x] | Moderate Hub Content (review, approve, reject) | User & Content Management | Pending | Coded | Backend `GET /api/library/contents/moderation-queue`, `POST .../approval`, `POST .../rejection` (`LibraryContentService.approve/reject/listModerationQueue`) — subject-scoped như Blog moderation. Frontend `/hub-moderation`. |
| [ ] | Manage Hub (categorize, tag, organize, pin) | User & Content Management | Pending | Not found | Chưa thấy category/tag/pin/organize model hoặc API cho Hub. |
| [x] | View / Update AI System Prompts | User & Content Management | Pending | Coded | Backend `/api/it-staff/system-prompts` (`ItStaffController.java`); frontend `/it-staff`; prompt được apply vào lesson/slide/molecule AI flows. Role contract hiện là `IT_STAFF`. |
| [x] | View Blog List (reader + moderation) | Blog | Pending | Coded | Backend `/api/blog-posts`; frontend `/blog` và `/blog/moderation`. |
| [x] | Remove / Delete Blog Post | Blog | Pending | Coded | Teacher delete own post; Moderator remove post with reason. |
| [ ] | Manage Classroom Resources & Assignments | Classroom | Planned | Not found | Chưa thấy classroom/class hub/resource/assignment module. |
| [ ] | Assign Homework with Deadline | Classroom | Planned | Not found | Chưa thấy assignment/deadline API hoặc UI. |
| [ ] | Student View Teaching Resources | Classroom | Planned | Not found | Chưa thấy student classroom/resource access module. |
| [ ] | Student Assignment Submission | Classroom | Planned | Not found | Chưa thấy submission/upload-text assignment module. |
| [ ] | Teacher Review Student Submissions | Classroom | Planned | Not found | Chưa thấy teacher review submissions module. |
| [ ] | Submit Lesson Plan for Approval | Lesson | Planned | Not found | Lesson plan generation/edit exists, but no approval status/workflow found. |
| [ ] | Moderator Approve / Reject Lesson Plans | Lesson | Planned | Not found | Chưa thấy lesson approval review API/UI. |
| [ ] | AI Content Statistics Dashboard | Principal | Planned | Not found | Chưa thấy dashboard thống kê số giáo án/slide AI theo giáo viên. |
| [ ] | Principal Management Dashboard | Principal | Planned | Not found | WBS row thiếu feature/effort/notes; chưa thấy route/dashboard riêng cho Principal. |

## Code Pointers

- Blog API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/BlogController.java`; service validation: `be/src/main/java/com/edua/beeduasystem/service/blog/BlogPostService.java`
- Blog UI: `fe/components/blog/BlogCommunityPage.tsx`, `fe/app/blog/moderation/page.tsx`
- Library/private content API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/LibraryContentController.java`
- Library/private content UI: `fe/app/library/page.tsx`, `fe/lib/library.ts`
- Hub submit/unsubmit: `LibraryContentService.submit/unsubmit` (be), `submitLibraryContent`/`unsubmitLibraryContent` (`fe/lib/library.ts`)
- Hub moderation (approve/reject/queue): `LibraryContentService.approve/reject/listModerationQueue`, `LibraryContentController` (be); `fe/app/hub-moderation/page.tsx`
- Hub public feed/detail/customize API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/HubContentController.java`, `service/library/HubContentService.java`
- Hub comments/reports: `service/library/HubCommentService.java`, `HubContentReportService.java`; migrations `V19__add_library_content_review_fields.sql`, `V20__create_hub_comments_and_reports.sql`
- Hub UI: `fe/app/community-hub/page.tsx`, `fe/components/hub/CommunityHubPage.tsx`, `fe/lib/hub.ts`
- Account management API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/PrincipalController.java`, `be/src/main/java/com/edua/beeduasystem/presentation/controller/ModeratorController.java`
- Account management UI: `fe/app/user-management/page.tsx`, `fe/app/it-staff-users/page.tsx`
- IT Staff prompt management API/UI: `be/src/main/java/com/edua/beeduasystem/presentation/controller/ItStaffController.java`, `be/src/main/java/com/edua/beeduasystem/service/ai/AiSystemPromptService.java`, `fe/app/it-staff/page.tsx`
- Notifications API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/NotificationController.java`, `be/src/main/java/com/edua/beeduasystem/service/notification/NotificationService.java`
- Notifications UI: `fe/app/notifications/page.tsx`, `fe/lib/notifications.ts`, `fe/lib/ws/notifications-client.ts`, badge trong `fe/components/layout/Sidebar.tsx`

## Follow-Up Notes

- Workbook wording has been corrected: Principal owns school-level account management; IT Staff owns system-prompt management.
- Code role contract now uses `PRINCIPAL` for Principal-level account management.
- Code role contract now uses `IT_STAFF` for IT Staff prompt/account management.
- Decision (this session): Activity Log ownership moved from Mod/Principal to `IT Staff` (IT Manager). WBS source (`(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS`, row 36 col E) updated to match; `designs/auth/rbac-screen-access.md` now lists "Activity Log" as its own row scoped to IT Staff, separate from "Principal Dashboard".
- Resolved: the shared Supabase dev DB's `flyway_schema_history` drift at V18 (schema had `library_contents.submitted_at` without V18 recorded as applied) has been reconciled — history rows for V18/V19 inserted and the missing `idx_library_contents_status_subject` index created. `./mvnw spring-boot:run` / `scripts/start.ps1` against the cloud DB now succeeds.
- Runtime-verified via curl against the running backend (JWTs minted locally with the configured HS256 secret for existing TEACHER/MODERATOR seed accounts, no code changes made to auth): Library content create/submit/moderation-queue/approve/reject (incl. 400 on missing rejection reason, 403 on wrong role/subject), and Hub public list/detail (guest, no token), comment create/update/delete (403 cross-user), report, and customize-to-library. All endpoints behaved per the checklist entries above.
