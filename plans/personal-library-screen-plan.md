# Kế hoạch làm màn Personal Library

## Mục tiêu

Tạo màn `/library` để giáo viên xem, tìm kiếm, lọc và mở nội dung do mình tạo:

- Bài giảng
- Slide
- Mô phỏng

Phiên bản đầu ưu tiên UI hoạt động với mock data, nhưng type và cấu trúc phải sẵn
sàng thay nguồn dữ liệu bằng API ở giai đoạn persistence.

## Phạm vi phiên bản đầu

### Có trong màn đầu tiên

- Header: tiêu đề `Thư viện của tôi`, tổng số nội dung, nút tạo nội dung mới.
- Ba tab: `Bài giảng`, `Slide`, `Mô phỏng`.
- Ô tìm kiếm theo tiêu đề.
- Bộ lọc: môn học, trạng thái nội dung, thời gian cập nhật.
- Danh sách dạng card có ảnh/biểu tượng, tiêu đề, loại, môn học, thời điểm cập nhật,
  trạng thái và menu thao tác.
- Empty state khi chưa có nội dung hoặc không có kết quả lọc.
- Loading/skeleton state.
- Menu mỗi card: Mở, Đổi tên, Xóa (các thao tác có thể mock/toast ở phiên bản đầu).
- Bảo vệ route: chỉ người dùng đăng nhập được vào thư viện.

### Chưa làm trong màn đầu tiên

- Lưu dữ liệu thật vào PostgreSQL/R2.
- Autosave, version/revision và workflow Hub review.
- Chia sẻ nội dung hoặc gửi duyệt Community Hub.
- Export file.

## Thiết kế dữ liệu frontend

Tạo type dùng chung, không gắn trực tiếp vào component:

```ts
type LibraryContentType = "LESSON_PLAN" | "SLIDE_DECK" | "SIMULATION";
type LibraryContentStatus = "PRIVATE" | "PENDING_REVIEW" | "REJECTED" | "PUBLISHED";

type LibraryItem = {
  id: string;
  type: LibraryContentType;
  title: string;
  subject: "MATH" | "PHYSICS" | "CHEMISTRY";
  status: LibraryContentStatus;
  thumbnailUrl?: string;
  updatedAt: string;
  createdAt: string;
  description?: string;
};
```

Đặt type và mock data trong `fe/data/` hoặc `fe/lib/library/`, không để inline
trong page component. Khi backend sẵn sàng, thay mock bằng `LibraryItem[]` lấy từ API.

## Kế hoạch thực hiện

### Bước 1 — Khảo sát và dựng route

- [ ] Đọc `fe/AGENTS.md` và guide Next.js phù hợp trước khi sửa frontend.
- [ ] Tạo route `fe/app/library/page.tsx`.
- [ ] Thêm `/library` vào sidebar, trong nhóm `CONTENT`.
- [ ] Thêm quyền route `/library: { requireAuth: true }`.
- [ ] Chọn UI layout đang dùng trong dashboard để giữ sidebar/header nhất quán.

**Kết quả:** người dùng đăng nhập mở được `/library`; khách bị chuyển đến đăng nhập.

### Bước 2 — Model, mock data và service boundary

- [ ] Tạo `LibraryItem` types.
- [ ] Tạo mock data gồm ít nhất 2 item mỗi loại content và đủ 3 môn học.
- [ ] Tạo `libraryService.ts` với các hàm `listLibraryItems`, `renameLibraryItem`,
  `deleteLibraryItem`.
- [ ] Đánh dấu rõ service là mock tạm thời và thiết kế method signature để thay API sau này.

**Kết quả:** UI không phụ thuộc vào dữ liệu hard-code trong JSX.

### Bước 3 — Xây layout và danh sách card

- [ ] Tạo `LibraryPage`/`LibraryWorkspace` component.
- [ ] Tạo `LibraryTabs` component.
- [ ] Tạo reusable `LibraryContentCard`.
- [ ] Hiển thị metadata, badge môn học, badge trạng thái và thumbnail fallback.
- [ ] Card bấm được để mở nội dung đúng theo `type` (route đích có thể tạm mock nếu chưa tồn tại).

**Kết quả:** teacher xem được ba nhóm nội dung trong giao diện responsive.

### Bước 4 — Tìm kiếm, lọc và UX states

- [ ] Search client-side theo title/description.
- [ ] Thêm filter môn học và trạng thái.
- [ ] Thêm sort theo cập nhật mới nhất/cũ nhất/tên.
- [ ] Implement empty state và no-result state.
- [ ] Implement loading skeleton thay vì màn hình trống.

**Kết quả:** lọc và tìm kiếm thay đổi card list đúng, có thông báo rõ ràng khi không có kết quả.

### Bước 5 — Thao tác card

- [ ] Menu `Mở` dẫn đến route tương ứng.
- [ ] Modal hoặc inline input `Đổi tên`.
- [ ] Dialog xác nhận `Xóa`.
- [ ] Toast thành công/lỗi.
- [ ] Đảm bảo thao tác chỉ áp dụng lên item của current user khi API thật được nối.

**Kết quả:** luồng quản lý cơ bản hoạt động với mock service.

### Bước 6 — Chất lượng và hand-off

- [ ] Kiểm tra mobile/tablet/desktop, không để sidebar/card bị overflow.
- [ ] Kiểm tra keyboard navigation cho tab, filter và menu.
- [ ] Chạy `npm run lint`, `npm run typecheck`, `npm run build` trong `fe/`.
- [ ] Cập nhật `plans/iteration-2-remaining-tasks.md`: đánh dấu phần UI Personal Library đã hoàn thành, còn persistence là task riêng.

## Thiết kế backend tiếp theo (không làm trong UI PR đầu)

Sau khi UI được duyệt, triển khai theo layered architecture:

1. Migration + domain model `LibraryContent`/metadata.
2. Repository interface và JPA implementation.
3. Service đảm bảo chỉ owner mới xem/sửa/xóa.
4. API `GET /api/library`, `PATCH /api/library/{id}`, `DELETE /api/library/{id}`.
5. Thay `libraryService` mock bằng API client; giữ nguyên type và UI components.

## Tiêu chí hoàn thành UI PR

- Route `/library` được bảo vệ bằng đăng nhập.
- Có tabs, search, filter, sort, cards và đầy đủ UX states.
- Có mock CRUD UI và confirmation khi xóa.
- Không sửa/refactor ngoài phạm vi thư viện.
- Lint, typecheck và production build đều pass.
