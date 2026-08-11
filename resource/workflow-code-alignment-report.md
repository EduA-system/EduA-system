# Các điểm Workflow đang khác code hiện tại

Ngày lập: 2026-08-11  
Nguồn workflow: `C:\Users\Vu Tuan Hiep\Downloads\Workflow`  
Mục đích file này: liệt kê **những chỗ Workflow đang mô tả khác với code thật**, để BA chỉnh lại Workflow hoặc xác nhận cần tạo task dev mới.

## Cách đọc

- **Role**: role chính đang thao tác trong Workflow.
- **Workflow đang ghi**: hành vi/bước đang thể hiện trong file Workflow.
- **Code hiện tại**: hành vi đã kiểm tra trong codebase.
- **Gợi ý cho BA**: nếu muốn Workflow khớp code hiện tại thì nên sửa Workflow theo hướng này. Nếu BA muốn giữ Workflow như cũ thì phần đó phải chuyển thành task dev.

## Kết luận nhanh cho BA

Code hiện tại đã khớp phần lớn các luồng chính. Các điểm khác nhau đáng chú ý nhất nằm ở:

1. **Moderator - Add Teacher Account**: Workflow có upload file cho tài khoản Teacher, nhưng code hiện chỉ thêm Teacher thủ công. 
2. **Moderator - Update Teacher Account**: Workflow có sửa thông tin Teacher, code hiện chưa có API/UI update Teacher.
3. **Teacher - Autosave mỗi 1 phút**: Workflow ghi autosave định kỳ vào Personal Library, code hiện không có timer 60 giây.
4. **Teacher - Unpublish Content**: Workflow có gỡ nội dung public về nháp/private, code hiện chỉ có unsubmit nội dung đang chờ duyệt.
5. **Teacher - Test**: Workflow ghi lưu test vào Personal Library hoàn chỉnh, UI hiện chưa có nút/luồng save test hoàn chỉnh.
6. **Class resource / student notification**: một số workflow yêu cầu notify hoặc cleanup phụ, code hiện chưa làm đủ.
7. **Principal - Ban Moderator/IT Staff**: Workflow có luồng ban riêng, code hiện thiên về replace và không cho ban độc lập.

## Bảng các Workflow lệch với code

| #   | Workflow                               | Role               | Workflow đang ghi                                                                          | Code hiện tại                                                                                                                                                                                                   | Gợi ý cho BA                                                                                                                                                        |
| --- | -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lesson plan                            | Teacher            | Sau khi tạo/sửa giáo án, hệ thống autosave vào Personal Library mỗi 1 phút.                | Code lưu khi generate xong hoặc khi người dùng bấm lưu; chưa thấy timer autosave 60 giây vào Personal Library.                                                                                                  | Nếu không định làm autosave thật, sửa Workflow thành “lưu sau khi tạo xong” và “Teacher bấm Save để lưu thay đổi”.                                                  |
| 2   | Slide                                  | Teacher            | Slide được autosave vào Personal Library mỗi 1 phút; có luồng AI edit slide đầy đủ.        | Code có tạo outline, tạo slide, editor, lưu vào thư viện, trình chiếu. Autosave Personal Library không chạy mỗi 1 phút; AI edit slide chưa đủ như Workflow.                                                     | Sửa Workflow bỏ autosave định kỳ, hoặc ghi rõ autosave chỉ là local/draft nếu đó là ý đúng. AI edit slide nên ghi là phạm vi giới hạn nếu chưa làm đủ.              |
| 3   | Test                                   | Teacher            | Teacher tạo test, review, chỉnh sửa thủ công, lưu test vào Personal Library.               | Backend có generate/stream/regenerate test; frontend có editor test nhưng UI chưa có nút gọi `saveDraft()`. Library tab TEST vẫn ghi tạo test đang phát triển.                                                  | Sửa Workflow thành “generate/review test” và ghi “lưu test vào thư viện: chưa triển khai” nếu BA muốn phản ánh code hiện tại.                                       |
| 4   | Presentation mode                      | Teacher            | Khi asset trong slide lỗi load thì có cảnh báo/placeholder riêng.                          | Code có fullscreen, chuyển slide bằng phím/chuột, render nội dung tương tác; chưa thấy xử lý cảnh báo asset lỗi load rõ như Workflow.                                                                           | Bỏ bước cảnh báo asset lỗi khỏi Workflow, hoặc ghi đây là yêu cầu cần phát triển thêm.                                                                              |
| 6   | Weekly Schedule & Lesson Plan Approval | Moderator, Teacher | Moderator set deadline trong luồng tạo weekly task.                                        | Code tự tính deadline theo tuần ở server.                                                                                                                                                                       | Sửa Workflow thành deadline được hệ thống tự tính, không phải Moderator nhập thủ công.                                                                              |
| 7   | Edit Weekly Task                       | Moderator          | Moderator sửa một weekly task cụ thể.                                                      | Code sửa theo cụm task tuần/bài trên `/weekly-schedule`, không hoàn toàn là sửa từng task độc lập; Moderator bấm card bài để mở popup giáo viên + status, chỉ giáo viên có trạng thái `SUBMITTED` mới đi sang `/lesson-plan-approval?taskId=...&preview=1`; lịch nộp đã kết thúc thì không cho sửa task. | Làm rõ trong Workflow là sửa theo cụm task tuần/bài, xem trạng thái giáo viên qua popup, và chỉ mở duyệt giáo án từ status “Đã nộp · chờ duyệt”. Nếu BA thật sự muốn sửa từng task hoặc sửa lịch quá khứ thì tạo task dev riêng. |
| 8   | Unsubmit Lesson Plan for Weekly Task   | Teacher            | Khi Teacher rút bài nộp, hệ thống notify Moderator.                                        | Code cho rút bài nộp và restore trạng thái, nhưng chưa notify Moderator.                                                                                                                                        | Nếu không cần notify, bỏ bước notify Moderator khỏi Workflow. Nếu cần giữ, tạo task dev notification.                                                               |
| 9   | Update Teacher Account                 | Moderator          | Moderator chọn Teacher, sửa thông tin tài khoản, validate, lưu và notify Teacher.          | Code hiện có xem danh sách Teacher, thêm Teacher, thu hồi, kích hoạt lại; chưa có API/UI update Teacher.                                                                                                        | Nếu code hiện tại là đúng phạm vi, bỏ workflow Update Teacher Account hoặc đổi thành “View/Deactivate/Reactivate Teacher”.                                          |
| 10  | Publish Content                        | Teacher, Moderator | Workflow dùng trạng thái publish/published.                                                | Code dùng trạng thái `APPROVED`; nội dung approved hiển thị trên Community Hub.                                                                                                                                 | Có thể đổi từ “Published” sang “Approved/Public on Hub” để khớp thuật ngữ code.                                                                                     |
| 11  | Unpublish Content                      | Teacher            | Teacher gỡ nội dung đã public khỏi Hub và đưa về nháp/private.                             | Code chỉ có `unsubmit` cho content đang `SUBMITTED`, chưa có unpublish content đã `APPROVED`.                                                                                                                   | Nếu chưa làm tính năng này, sửa Workflow thành chỉ hỗ trợ rút nội dung khi đang chờ duyệt.                                                                          |
| 12  | Delete Content                         | Teacher            | Khi xóa content đang chờ duyệt/public, có xử lý đầy đủ theo luồng và thông báo liên quan.  | Code soft-delete content của owner; nếu content đang chờ duyệt thì biến khỏi queue nhưng chưa notify Moderator.                                                                                                 | Bỏ bước notify khỏi Workflow, hoặc ghi notify là yêu cầu phát triển thêm.                                                                                           |
| 16  | Hide Comment on Own Content            | Teacher            | Khi chủ content ẩn comment của người khác, hệ thống notify tác giả comment.                | Code có hide comment trên Hub, nhưng chưa notify tác giả comment.                                                                                                                                               | Nếu không cần notify, bỏ bước notify khỏi Workflow.                                                                                                                 |
| 18  | Delete Class Resource                  | Teacher            | Xóa resource thì xóa submissions liên quan và notify enrolled students.                    | Code cho Teacher xóa resource của lớp mình, nhưng chưa cleanup submissions và chưa notify students.                                                                                                             | Sửa Workflow thành soft-delete resource thôi, hoặc giữ bước cleanup/notify làm task dev.                                                                            |
| 19  | Update Class Resource                  | Teacher            | Có bước confirm bắt buộc trước khi cập nhật resource.                                      | Code cho sửa title/description/file/deadline/submission setting và chặn khi class inactive; bước confirm không thấy rõ là bắt buộc.                                                                             | Nếu confirm không bắt buộc, bỏ bước confirm khỏi Workflow hoặc đổi thành optional UI confirm.                                                                       |
| 21  | Remove Student                         | Teacher            | Khi remove student thì notify student; class inactive là read-only nên không thao tác ghi. | Code soft-remove student nhưng chưa notify; remove student vẫn có thể chạy khi class inactive.                                                                                                                  | Nếu giữ code hiện tại, bỏ notify và bỏ điều kiện inactive khỏi Workflow. Nếu muốn read-only đúng nghĩa, tạo task dev.                                               |
| 24  | Delete Own Public Content              | Teacher            | Teacher xóa public content của mình và comments liên quan được xử lý theo luồng.           | Backend cho owner soft-delete content để không còn hiện trên Hub; Community Hub detail chưa thấy action xóa public content; comments không bị xóa riêng.                                                        | Sửa Workflow thành soft-delete content, không mô tả hard-delete comments nếu đó không phải yêu cầu thật.                                                            |
| 27  | Change/Unsubmit Assignment             | Student            | Khi Student đổi/rút bài nộp thì notify Teacher.                                            | Code cho nộp lại bằng upsert và có thể unsubmit bằng delete submission; unsubmit chưa notify Teacher.                                                                                                           | Nếu không cần thông báo khi rút bài, bỏ notify Teacher khỏi Workflow.                                                                                               |
| 28  | Set Class Inactive -> Read-Only Access | Teacher            | Khi chuyển class inactive thì notify students và mọi thao tác ghi bị chặn.                 | Code đổi status class và chặn nhiều thao tác resource/submission, nhưng chưa notify students; remove student vẫn thao tác được.                                                                                 | Sửa Workflow thành “inactive chặn phần lớn thao tác học tập” thay vì read-only tuyệt đối, hoặc tạo task dev để chặn triệt để.                                       |
| 31  | Delete Blog Post                       | Teacher, Moderator | Xóa blog post và comments.                                                                 | Code soft-delete blog post; post không còn public, nhưng comments không bị hard-delete riêng.                                                                                                                   | Sửa Workflow thành soft-delete post; không ghi xóa comments nếu không cần nghiệp vụ đó.                                                                             |
| 36  | Hide Comment on Own Blog Post          | Teacher, Moderator | Khi ẩn comment blog thì notify comment author.                                             | Code có hide comment nhưng chưa notify tác giả comment.                                                                                                                                                         | Nếu không cần notification, bỏ bước notify khỏi Workflow.                                                                                                           |
| 38  | Add Teacher Account                    | Moderator          | Moderator có hai cách thêm tài khoản Teacher: Upload file hoặc Manually.                   | Code quản lý Teacher account chỉ thêm thủ công từng email bằng `POST /api/moderator/teachers`. Không thấy `POST /api/moderator/teachers/import`, `MultipartFile` cho Teacher, hoặc UI upload trong tab Teacher. | Nếu không định làm upload Teacher account, sửa Workflow bỏ nhánh Upload. Giữ lại manual add Teacher. Đừng nhầm với Add Students vì Add Students đã có CSV/XLS/XLSX. |
| 40  | Add Mod Account                        | Principal          | Principal có thể thêm/promote Moderator theo luồng Workflow.                               | Code thêm Moderator mới, mỗi subject chỉ có một Moderator active. Email đang active bị coi duplicate, không promote active Teacher thành Moderator qua add.                                                     | Sửa Workflow ghi rõ chỉ thêm bằng email chưa active hoặc tài khoản hợp lệ theo rule code; không mô tả promote Teacher nếu chưa có.                                  |
| 42  | Replace Moderator Account              | Principal          | Replace Moderator và notify new/former Moderator.                                          | Code có replace Moderator; chưa thấy notification cho người mới/người cũ.                                                                                                                                       | Nếu chưa cần notify, bỏ bước notify khỏi Workflow.                                                                                                                  |
| 43  | Replace IT Support Account             | Principal          | Replace IT Staff và notify new/former IT Staff.                                            | Code có replace IT Staff; former IT bị disable, người mới được role IT Staff; chưa thấy notification.                                                                                                           | Nếu chưa cần notify, bỏ bước notify khỏi Workflow.                                                                                                                  |
| 44  | Ban Moderator Account                  | Principal          | Principal có luồng ban Moderator riêng, có thể không cần replace ngay.                     | Code không cho ban Moderator độc lập, bắt buộc replace.                                                                                                                                                         | Sửa Workflow thành “Replace Moderator” thay vì “Ban Moderator”, hoặc xác nhận cần thêm feature ban riêng.                                                           |
| 45  | Ban IT Support Account                 | Principal          | Principal có luồng ban IT Support riêng.                                                   | Code không cho disable IT Staff độc lập, bắt buộc replace.                                                                                                                                                      | Sửa Workflow thành “Replace IT Staff” thay vì “Ban IT Support”, hoặc xác nhận cần thêm feature ban riêng.                                                           |

## Danh sách Workflow không thấy lệch lớn

Các workflow sau nhìn chung đã khớp luồng chính của code, không cần BA ưu tiên chỉnh nếu chỉ muốn đồng bộ tài liệu:

| #   | Workflow                           | Role               |
| --- | ---------------------------------- | ------------------ |
| 5   | Customize Physics Simulation       | Teacher            |
| 13  | View & Comment on Hub Content      | Teacher            |
| 14  | Edit Comment on Hub Content        | Teacher            |
| 15  | Delete Own Comment on Hub Content  | Teacher            |
| 17  | Create Class Workflow              | Teacher            |
| 20  | Add Students Workflow              | Teacher            |
| 22  | Generate Molecule 3D               | Teacher            |
| 23  | Customize content on community hub | Teacher            |
| 25  | Post Class Resource Workflow       | Teacher            |
| 26  | Submit Assignment Workflow         | Student            |
| 29  | Create Blog Post                   | Teacher, Moderator |
| 30  | Edit Blog Post                     | Teacher, Moderator |
| 32  | Remove Blog Post                   | Moderator          |
| 33  | View & Comment on Blog Post        | Teacher            |
| 34  | Edit Comment on Blog Post          | Teacher            |
| 35  | Delete Comment on Blog Post        | Teacher            |
| 37  | Create Notifications               | Moderator          |
| 39  | Ban Teacher                        | Moderator          |
| 41  | Add IT Account                     | Principal          |

## Ưu tiên BA nên chỉnh Workflow trước

1. **Add Teacher Account**: bỏ nhánh upload file nếu chưa muốn dev thêm import Teacher account.
2. **Update Teacher Account**: đổi thành view/deactivate/reactivate Teacher, hoặc đánh dấu là feature chưa triển khai.
3. **Autosave mỗi 1 phút**: bỏ khỏi Lesson Plan/Slide/Test nếu sản phẩm không yêu cầu autosave thật vào Personal Library.
4. **Unpublish Content**: đổi thành chỉ unsubmit content đang chờ duyệt nếu chưa có unpublish public content.
5. **Ban Moderator/IT Staff**: đổi wording thành replace account nếu code vẫn bắt buộc replace.
6. **Notification phụ**: rà lại các bước notify trong Workflow; code chưa có notify ở unsubmit weekly task, hide comment, remove student, inactive class, replace account.

## File code đã dùng để đối chiếu chính

Frontend:

- `fe/app/user-management/page.tsx`
- `fe/app/library/page.tsx`
- `fe/components/dashboard/LessonEditDashboard.tsx`
- `fe/components/dashboard/PracticeExamEditDashboard.tsx`
- `fe/components/slide-maker/SlideMakerClient.tsx`
- `fe/components/slide-presentation/SlidePresentationOverlay.tsx`
- `fe/components/hub/CommunityHubDetailPage.tsx`
- `fe/app/weekly-schedule/page.tsx`
- `fe/app/lesson-plan-approval/page.tsx`
- `fe/lib/classroom.ts`
- `fe/lib/hub.ts`
- `fe/lib/library.ts`
- `fe/lib/weekly-task.ts`

Backend:

- `be/src/main/java/com/edua/beeduasystem/presentation/controller/ClassController.java`
- `be/src/main/java/com/edua/beeduasystem/presentation/controller/ModeratorController.java`
- `be/src/main/java/com/edua/beeduasystem/presentation/controller/*Controller.java`
- `be/src/main/java/com/edua/beeduasystem/service/auth/ModeratorTeacherService.java`
- `be/src/main/java/com/edua/beeduasystem/service/auth/PrincipalModeratorService.java`
- `be/src/main/java/com/edua/beeduasystem/service/auth/PrincipalItStaffService.java`
- `be/src/main/java/com/edua/beeduasystem/service/classroom/ClassEnrollmentService.java`
- `be/src/main/java/com/edua/beeduasystem/service/classroom/ClassManagementService.java`
- `be/src/main/java/com/edua/beeduasystem/service/classroom/ClassResourceService.java`
- `be/src/main/java/com/edua/beeduasystem/service/classroom/SubmissionService.java`
- `be/src/main/java/com/edua/beeduasystem/service/library/HubCommentService.java`
- `be/src/main/java/com/edua/beeduasystem/service/library/HubContentService.java`
- `be/src/main/java/com/edua/beeduasystem/service/library/LibraryContentService.java`
- `be/src/main/java/com/edua/beeduasystem/service/notification/NotificationService.java`
