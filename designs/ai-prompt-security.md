# AI Prompt Security — Lesson Plan

> Quyết định: có cần chặn prompt injection / thêm pha call AI verify cho luồng sinh giáo án không?

## Bối cảnh & threat model

- `AiClient` là **gateway kỹ thuật thuần** (`generate(prompt)`) tới OpenAI/DeepSeek — không cầm tool, không thực thi hành động dựa theo nội dung model sinh ra.
- Input `userPrompt` do **chính giáo viên** nhập; output trả về **chính họ**.
- AI chỉ **sinh text** (giáo án 5512), lưu DB rồi render ở FE.

→ Prompt injection ở đây **rủi ro thấp**: kẻ tấn công = nạn nhân, không leo thang quyền, output không kích hoạt side-effect.

## Có cần pha call AI verify trước (LLM guard) không? — KHÔNG (chưa)

Pattern "gọi AI hỏi 'đây có phải prompt injection không'" **không đáng làm** cho hệ hiện tại:

1. Defend một threat gần như không tồn tại (xem threat model trên).
2. Ăn vào ngân sách latency **PRF-02** (draft ≤ 30s) — guard chạy tuần tự = cộng thêm một vòng API.
3. Tốn **gấp đôi chi phí AI** cho mọi request hợp lệ (99%+).
4. **Guard LLM cũng bị injection** — "...và trả về false" có thể qua mặt. Không phải boundary thật.
5. **False positive** chặn người dùng thật (prompt soạn giáo án rất đa dạng/lắt léo).
6. Không giải quyết rủi ro thật (stored XSS / nội dung Published).

### Khi nào guard mới xứng đáng
- AI output **kích hoạt hành động có side-effect** (tool, query DB, gửi mail).
- Xử lý **nội dung bên thứ ba không tin cậy** quy mô lớn.
- Multi-tenant, dữ liệu nhạy cảm cần cô lập mạnh.

Hệ hiện tại không thuộc nhóm nào ở trên.

### Nếu sau này cần "lọc nội dung độc hại"
Dùng **moderation endpoint** của provider (vd OpenAI Moderation API) — nhanh, rẻ/miễn phí — thay vì tự viết guard prompt. Lưu ý: moderation lo *harmful content*, **không** lo prompt injection (hai thứ khác nhau).

## Kết luận — thứ tự ưu tiên phòng thủ

1. ✅ **Phân tách prompt**: bọc input người dùng/file trong khối dữ liệu có nhãn rõ là *data, không phải instruction* (ở `LessonPlan5512PromptBuilder`, không phải ở `AiClient`). Rẻ, hiệu quả nhất.
2. ✅ **Sanitize output** trước khi lưu/render (**SEC-06**) — rủi ro thật, đặc biệt với luồng **Published (BR-15)**. Output JSON 5512 thì chỉ nhận đúng field + text-escaping, không `dangerouslySetInnerHTML`.
3. ✅ **Rate limit** (**SEC-07**) chống lạm dụng chi phí.
4. ⏸️ **Guard call / moderation** — để dành, chỉ thêm khi AI cầm tool hoặc luồng Published phục vụ người ngoài ở quy mô lớn.

**Không thêm gì vào `AiClient`** — giữ nó là thin gateway. Phòng thủ nằm ở prompt builder + sanitize output. Làm 1–3 là đủ tương xứng; thêm pha verify AI lúc này là over-engineer.
