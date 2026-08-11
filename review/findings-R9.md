# R9 — Upload / R2 / mô phỏng / phân tử

Quét ngày 2026-08-12 trên `main`, đọc tay.

Phạm vi: `be/.../service/upload/`, `service/physicssimulation/`, `service/molecule/`, controller,
security/rate-limit/R2 adapter liên quan, `fe/app/mo-phong-vat-ly/` và client molecule/physics API.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R9-01 | `SecurityConfig.java:46-47` | Upload public, không gắn chủ sở hữu hay quota → R2 thành public file host | **Cao** | Sửa |
| R9-02 | `UploadService.java:37` | Chỉ kiểm extension; MIME do client quyết định, không kiểm magic byte | **Cao** | Sửa |
| R9-03 | `UploadService.java:42` | File R2 không có bản ghi/tham chiếu/lifecycle nên upload bỏ dở thành rác vĩnh viễn | TB | Sửa |
| R9-04 | `MoleculeController.java:16`, `RateLimitFilter.java:42` | API molecule public và không bị AI rate limit | **Cao** | Sửa |
| R9-05 | `MoleculeService.java:78` | Đường parse công thức tự dựng liên kết đơn sai hóa trị cho nhiều chất | **Cao** | Sửa |
| R9-06 | `MoleculeService.java:130` | Không giới hạn số atom/bond và không loại liên kết trùng/rời rạc từ AI | TB | Sửa |
| R9-07 | `PhysicsSimulationService.java:94` | Schema trùng key hoặc min > max ném 500 thay vì lỗi input 400 | TB | Sửa |

---

## R9-01 — Upload public, không gắn chủ sở hữu hay quota → R2 thành public file host **[Cao]**

`SecurityConfig.PUBLIC_PATHS:47` permit-all `/api/uploads/**`; `UploadController` cũng không có
`@PreAuthorize`. `RateLimitFilter:31-35` bỏ qua request không có JWT. Sau đó R2 adapter gắn
`Cache-Control: public, max-age=31536000, immutable` (`R2StorageAdapter:24-32`).

**Kịch bản lỗi:** bất kỳ ai không đăng nhập gửi liên tục file dưới 10 MB. Mỗi request hợp lệ tạo một
object UUID public, cache một năm, không quota theo user/IP và không thể thu hồi theo chủ sở hữu. Chi phí
R2 tăng, bucket tích rác và endpoint trở thành nơi host file công khai bằng hạ tầng EDUA.

**Sửa:** yêu cầu JWT và role phù hợp; quota/rate limit theo user (thêm upload vào bucket nghiêm hơn),
lưu owner + trạng thái của object và dùng signed URL/private bucket nếu tài liệu không phải public.

## R9-02 — Chỉ kiểm extension; MIME do client quyết định, không kiểm magic byte **[Cao]**

`UploadService.upload():37-44` chỉ allowlist phần sau dấu chấm; `contentType` lấy nguyên từ multipart
rồi được R2 tin để phục vụ response header. Nội dung không được kiểm signature/file structure.

**Kịch bản lỗi:** upload bytes HTML/JS với filename `tai-lieu.pdf` nhưng multipart
`Content-Type: text/html`. Service accept vì đuôi `.pdf`, R2 public URL trả chính content type do kẻ gửi
chọn. Ngay cả khi bucket ở origin riêng nên không chiếm session EDUA, đây vẫn là public content hosting
và các client preview/download tin vào metadata sai. Trường hợp ngược lại, PDF/ảnh thật có đuôi sai cũng
bị từ chối không nhất quán.

**Sửa:** detect MIME từ bytes (Tika/magic signature), đối chiếu extension + detected type + allowlist,
tự gán content type ở server. Với Office/PDF cần kiểm basic format và cân nhắc AV scan trước public hóa.

## R9-03 — File R2 không có bản ghi/tham chiếu/lifecycle nên upload bỏ dở thành rác vĩnh viễn **[TB]**

Upload tạo key UUID rồi trả URL ngay (`UploadService:42-46`), nhưng không có metadata repository,
`delete` gateway hay job cleanup. Các màn editor upload ảnh trước khi người dùng lưu bài; người dùng hủy
form, refresh, hoặc request cập nhật DB thất bại thì object đã public nhưng không có cơ chế biết nó còn
được dùng.

**Sửa:** tạo upload record `PENDING` gắn user, đánh `ATTACHED` khi entity lưu thành công và dọn pending
sau TTL; thêm `StorageClient.delete`/R2 lifecycle rule. Đừng coi upload thành công là giao dịch hoàn tất.

## R9-04 — API molecule public và không bị AI rate limit **[Cao]**

`MoleculeController` không có authorization; `SecurityConfig.PUBLIC_PATHS:46` còn permit-all
`/api/molecules/**`. Với input tên chất (không phải công thức có số), `MoleculeService.build():62-69`
gọi AI. `RateLimitFilter.isAiEndpoint():42-46` chỉ phân loại `/generate`, `/ai-edit`,
`/slide-design/fill-content`; `/api/molecules/build` không khớp. Vì caller anonymous, filter cũng bỏ qua
hoàn toàn.

**Kịch bản lỗi:** bot POST các tên/chữ khác nhau, mỗi request tạo virtual thread và gọi AI shared client.
Không cần tài khoản, không có quota, gây hao API quota/chi phí và làm chậm tính năng AI thật.

**Sửa:** bỏ molecule khỏi public paths, yêu cầu JWT + role có quyền dùng AI; thêm `/molecules/build` vào
AI rate-limit, giới hạn concurrent requests và áp dụng chống abuse cả trước khi gọi provider.

## R9-05 — Đường parse công thức tự dựng liên kết đơn sai hóa trị cho nhiều chất **[Cao]**

Khi input chứa số, `buildFromFormula():78-106` bypass AI và nối mọi nguyên tử bằng bond order 1. Ví dụ
`CO2` trả C—O và C—O đơn; frontend `geometry.ts:11-20` tự bù hydrogen theo valence, nên sinh thêm H cho
C và hai O thay vì CO₂ với hai liên kết đôi. `N2` thành N—N đơn rồi được bù hydrogen, thay vì liên kết ba.

**Kịch bản lỗi:** học sinh nhập các công thức phổ biến có liên kết bội; mô hình 3D hiển thị chất khác,
nhưng không báo degraded/fallback vì response vẫn hợp lệ schema. Đây là sai dữ liệu dạy học, không chỉ
lỗi thẩm mỹ.

**Sửa:** chỉ dùng deterministic path cho catalog/SMILES đã biết; còn công thức tổng quát phải resolve
qua chemistry parser/dataset có bond order (hoặc AI có validation). Không suy luận cấu trúc từ formula
bằng chuỗi liên kết đơn.

## R9-06 — Không giới hạn số atom/bond và không loại liên kết trùng/rời rạc từ AI **[TB]**

`MoleculeService.validate():130-171` kiểm element, index và valence tối đa nhưng không đặt maximum
cho `raw.atoms`/`raw.bonds`; không reject edge trùng, graph rời rạc hay atom không có bond. Output đi
thẳng tới Three.js, nơi render sphere/bond cho mọi phần tử (`MoleculeViewer.tsx:25`).

**Kịch bản lỗi:** AI trả vài nghìn atom/bond hoặc graph có nhiều edge lặp. Backend chấp nhận nếu từng
valence chưa vượt ngưỡng; browser render nặng/đứng hoặc hiển thị cấu trúc vô nghĩa. Input 200 ký tự không
bảo đảm output provider bị giới hạn.

**Sửa:** giới hạn chặt atom/bond, reject duplicate undirected edge và graph disconnected (trừ khi có
rule đặc biệt), đồng thời enforce response token/byte cap ở AI client.

## R9-07 — Schema trùng key hoặc min > max ném 500 thay vì lỗi input 400 **[TB]**

`PhysicsSimulationEditRequest` chỉ validate từng entry not-null. `PhysicsSimulationService.validate():94-95`
dùng `Collectors.toMap` không merge function; hai schema entry cùng `key` gây `IllegalStateException`.
`min > max` cũng không bị bắt trước gọi AI. Cả hai đi qua global handler không có mapping nên trả 500.

**Kịch bản lỗi:** client stale/malicious gửi duplicate key, hoặc schema lỗi do preset update; request đã
có thể gọi AI (`edit():57-64`) trước khi lỗi mapping xảy ra. Người dùng thấy “internal server error” và
vẫn tốn lượt AI.

**Sửa:** validate toàn bộ schema (key unique, finite min/max/step, `min <= max`, currentValues đúng key
và range) trước `generateWithTimeout`; đổi lỗi request thành 400.

## Kiểm tra nhưng không có vấn đề

- Service upload từ chối mảng rỗng và >10 MB; Spring multipart cũng đặt max file/request 10 MB.
- AI physics có timeout, cancel future và chỉ cho output numeric key nằm trong schema/range.
- Molecule AI kiểm index, self-bond và valence upper bound; lỗi AI được đổi thành message thân thiện 502.
