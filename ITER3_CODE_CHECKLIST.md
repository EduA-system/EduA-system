# Iteration 3 Code Checklist

Source: `(đã làm) Report2_Project Tracking.xlsx`, sheet `WBS`, planned `Iteration 3`.

Legend:
- `[x] Coded`: có frontend + backend hoặc logic chính đã có trong code.
- `[~] Partial`: có một phần liên quan, nhưng chưa đủ theo scope WBS.
- `[ ] Not found`: chưa thấy module/API/UI tương ứng trong code hiện tại.

## Summary

| Code reality | Count |
| --- | ---: |
| Coded | 8 |
| Partial | 2 |
| Not found | 17 |

## Checklist

| Done | WBS item | Feature | WBS status | Code reality | Evidence / note |
| --- | --- | --- | --- | --- | --- |
| [x] | Submit / Unsubmit Hub Content for Review | Community Hub | Pending | Coded | Backend `POST/DELETE /api/library/contents/{id}/submission` (`LibraryContentController.java`, `LibraryContentService.submit/unsubmit`); `LibraryContentStatus` nay có `PRIVATE`/`SUBMITTED`; frontend nút "Gửi duyệt"/"Thu hồi" ở `/library`. Vẫn chưa có public visibility hay review/approve/reject — đó là "Moderate Hub Content" riêng. |
| [ ] | View Community Hub | Community Hub | Pending | Not found | Sidebar trỏ `Community Hub` về `/homepage`, nhưng `/homepage` chỉ render home page, chưa có hub listing thật. |
| [ ] | View Public Hub Content Detail (Guest preview) | Community Hub | Pending | Not found | Chưa thấy public hub detail/guest preview API hoặc route. |
| [ ] | Customize Hub Content | Community Hub | Pending | Not found | Chưa thấy flow copy/customize content từ hub public về library cá nhân. |
| [~] | View & Create Content Comments | Community Hub | Pending | Partial | Blog comments đã có, nhưng chưa thấy comment riêng cho Hub content. |
| [~] | Update / Delete Own Comment | Community Hub | Pending | Partial | Blog comment update/delete đã có owner-only; Hub comment chưa có. |
| [ ] | Delete Comment on Own Content | Community Hub | Pending | Not found | Chưa thấy API cho chủ content xoá comment của người khác trên content của mình. |
| [ ] | Report Violating Content | Community Hub | Pending | Not found | Chưa thấy report/violation entity, API, hoặc UI cho Hub content. |
| [x] | Moderator Account Management | User & Content Management | Pending | Coded | Backend `/api/principal/moderators` (`PrincipalController.java`); frontend `/user-management`. Role contract hiện là `PRINCIPAL`. |
| [x] | Teacher Account Management | User & Content Management | Pending | Coded | Backend `/api/moderator/teachers`; frontend `/user-management`. |
| [x] | Create Notifications (send to subject teachers) | User & Content Management | Pending | Coded | Backend `POST /api/notifications` (`NotificationController.java`, `NotificationService.create`) — Moderator broadcast tới Teacher cùng subject, fan-out `notifications`/`notification_recipients` (`V17__create_notifications.sql`) + push STOMP `/user/queue/notifications`. Frontend: form "Soạn thông báo" ở `/notifications` (chỉ hiện cho MODERATOR). Spec: `designs/API_designs/notifications.md`. |
| [x] | View & Manage My Notifications | User & Content Management | Pending | Coded | Backend `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `POST /read-all`. Frontend `fe/app/notifications/page.tsx` (list, filter unread, mark read/read-all) + badge chưa đọc realtime trên `Sidebar`. |
| [ ] | View & Filter Activity Log | User & Content Management | Pending | Not found | Có metadata `granted_by/granted_at` cho role assignment, nhưng chưa có audit/activity log module hoặc screen. |
| [ ] | Moderate Hub Content (review, approve, reject) | User & Content Management | Pending | Not found | Chưa thấy moderation workflow cho Hub content. Blog moderation là luồng riêng. |
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

- Blog API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/BlogController.java`
- Blog UI: `fe/components/blog/BlogCommunityPage.tsx`, `fe/app/blog/moderation/page.tsx`
- Library/private content API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/LibraryContentController.java`
- Library/private content UI: `fe/app/library/page.tsx`, `fe/lib/library.ts`
- Hub submit/unsubmit: `LibraryContentService.submit/unsubmit` (be), `submitLibraryContent`/`unsubmitLibraryContent` (`fe/lib/library.ts`)
- Account management API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/PrincipalController.java`, `be/src/main/java/com/edua/beeduasystem/presentation/controller/ModeratorController.java`
- Account management UI: `fe/app/user-management/page.tsx`, `fe/app/it-staff-users/page.tsx`
- IT Staff prompt management API/UI: `be/src/main/java/com/edua/beeduasystem/presentation/controller/ItStaffController.java`, `be/src/main/java/com/edua/beeduasystem/service/ai/AiSystemPromptService.java`, `fe/app/it-staff/page.tsx`
- Notifications API: `be/src/main/java/com/edua/beeduasystem/presentation/controller/NotificationController.java`, `be/src/main/java/com/edua/beeduasystem/service/notification/NotificationService.java`
- Notifications UI: `fe/app/notifications/page.tsx`, `fe/lib/notifications.ts`, `fe/lib/ws/notifications-client.ts`, badge trong `fe/components/layout/Sidebar.tsx`

## Follow-Up Notes

- Workbook wording has been corrected: Principal owns school-level account management; IT Staff owns system-prompt management.
- Code role contract now uses `PRINCIPAL` for Principal-level account management.
- Code role contract now uses `IT_STAFF` for IT Staff prompt/account management.
