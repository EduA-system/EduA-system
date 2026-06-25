# Slide Generation — API Design

> Thiết kế API cho luồng sinh slide từ Lesson Plan:
> `Lesson Plan → Generate Outline → Edit Outline → Generate Slides → Slide Deck`.
>
> Hạ tầng upload và STOMP dùng chung được mô tả tại
> [`api-chung.md`](./api-chung.md).

## Phạm vi

Tài liệu này chỉ mô tả các API cần thiết cho chức năng sinh slide:

- Sinh outline từ Lesson Plan.
- Cho phép người dùng chỉnh sửa outline trước khi sinh slide.
- Sinh từng slide bất đồng bộ từ outline.
- Theo dõi tiến trình và khôi phục phiên sinh slide khi mất kết nối.
- Lấy Slide Deck sau khi sinh xong.
- Sinh lại một slide bị lỗi hoặc chưa đạt yêu cầu.

Không bao gồm API chỉnh sửa thủ công toàn bộ Slide Deck trong editor.

---

## Quyết định thiết kế

- Client tự tạo `sessionId` và subscribe STOMP trước khi gọi API sinh slide.
- Sinh outline là request đồng bộ vì kết quả cần được người dùng kiểm tra và sửa trước.
- Sinh Slide Deck là tác vụ bất đồng bộ; API trả `202 Accepted`, kết quả từng slide được stream qua STOMP.
- Backend nhận toàn bộ outline đã chỉnh sửa khi bắt đầu sinh slide. Không cần lưu outline bằng một CRUD API riêng.
- Mỗi slide dùng canvas cố định `960 × 540`.
- Khi sinh hoàn tất, backend tự lưu Slide Deck và gửi `deckId` trong event `DONE`.
- Một slide sinh lỗi không làm dừng toàn bộ deck. Phiên kết thúc với trạng thái `PARTIALLY_COMPLETED` nếu còn slide lỗi.

---

## Danh sách API

| # | Method | Path | Mục đích | Đồng bộ? |
|---|--------|------|----------|----------|
| 1 | POST | `/api/slides/generate-outline` | Sinh outline từ Lesson Plan | sync |
| 2 | POST | `/api/slides/generate-parts` | Bắt đầu sinh từng slide từ outline | async + STOMP |
| 3 | GET | `/api/slides/sessions/{sessionId}` | Lấy trạng thái và kết quả hiện tại của phiên | sync |
| 4 | GET | `/api/slide-decks/{deckId}` | Lấy Slide Deck đã sinh | sync |
| 5 | POST | `/api/slide-decks/{deckId}/slides/{slideId}/regenerate` | Sinh lại một slide | async + STOMP |

**STOMP destination**

```text
/topic/slides/{sessionId}
```

---

## Mô hình dữ liệu chính

### Slide outline

```json
{
  "parts": [
    {
      "partIndex": 0,
      "title": "Khởi động",
      "slides": [
        {
          "slideIndex": 0,
          "title": "Câu hỏi mở đầu",
          "description": "Đặt vấn đề bằng một tình huống thực tế.",
          "role": "HOOK",
          "layout": "TITLE"
        }
      ]
    }
  ]
}
```

Giá trị đề xuất cho `role`:

```text
HOOK | EXPLAIN | DERIVE | DEMONSTRATE | PRACTICE | RECAP
```

Giá trị đề xuất cho `layout`:

```text
TITLE | BULLETS | FORMULA | IMAGE_FOCUS | COMPARISON | WORKED_EXAMPLE
```

### Rendered slide

```json
{
  "id": "slide-uuid",
  "slideIndex": 0,
  "title": "Câu hỏi mở đầu",
  "kind": "CONTENT",
  "width": 960,
  "height": 540,
  "background": "#FFFFFF",
  "elements": [
    {
      "id": "element-uuid",
      "type": "TEXT",
      "x": 80,
      "y": 60,
      "width": 800,
      "height": 100,
      "content": "Điều gì xảy ra khi điện trở tăng?",
      "style": {
        "fontSize": 32,
        "fontWeight": 700,
        "color": "#111827"
      }
    }
  ]
}
```

Các loại element tối thiểu:

```text
TEXT | IMAGE | SHAPE | EMBED | LATEX
```

---

## Chi tiết API

### 1. `POST /api/slides/generate-outline`

Sinh outline từ một Lesson Plan đã tồn tại.

```json
{
  "lessonPlanId": "lesson-plan-uuid",
  "referenceSlideDeckId": "reference-deck-uuid",
  "additionalInstruction": "Ưu tiên ví dụ thực tế và ít chữ."
}
```

Trong đó:

- `lessonPlanId`: bắt buộc.
- `referenceSlideDeckId`: không bắt buộc; dùng làm tham chiếu phong cách hoặc cấu trúc.
- `additionalInstruction`: không bắt buộc.

Response:

```http
200 OK
```

```json
{
  "sessionId": "session-uuid",
  "lessonPlanId": "lesson-plan-uuid",
  "topic": "Định luật Ohm",
  "outline": {
    "parts": [
      {
        "partIndex": 0,
        "title": "Khởi động",
        "slides": [
          {
            "slideIndex": 0,
            "title": "Câu hỏi mở đầu",
            "description": "Đặt vấn đề bằng tình huống thực tế.",
            "role": "HOOK",
            "layout": "TITLE"
          }
        ]
      }
    ]
  }
}
```

Lỗi:

- `400 Bad Request`: request thiếu `lessonPlanId`.
- `404 Not Found`: không tìm thấy Lesson Plan hoặc deck tham chiếu.
- `422 Unprocessable Entity`: Lesson Plan không có đủ nội dung để tạo outline.
- `502 Bad Gateway`: AI provider không trả được outline hợp lệ.

---

### 2. `POST /api/slides/generate-parts`

Bắt đầu sinh Slide Deck từ outline đã được người dùng chỉnh sửa.

Client phải subscribe `/topic/slides/{sessionId}` trước khi gọi API này.

```json
{
  "sessionId": "session-uuid",
  "lessonPlanId": "lesson-plan-uuid",
  "topic": "Định luật Ohm",
  "outline": {
    "parts": [
      {
        "partIndex": 0,
        "title": "Khởi động",
        "slides": [
          {
            "slideIndex": 0,
            "title": "Câu hỏi mở đầu",
            "description": "Đặt vấn đề bằng tình huống thực tế.",
            "role": "HOOK",
            "layout": "TITLE"
          }
        ]
      }
    ]
  }
}
```

Response:

```http
202 Accepted
```

```json
{
  "sessionId": "session-uuid",
  "status": "GENERATING",
  "totalSlides": 10
}
```

Validation:

- `sessionId`, `lessonPlanId` và `outline` là bắt buộc.
- `slideIndex` phải duy nhất và liên tục trong toàn outline.
- Outline phải có ít nhất một slide.
- Số slide tối đa cần được giới hạn theo business rule của hệ thống.

Lỗi đồng bộ:

- `400 Bad Request`: outline sai cấu trúc hoặc `sessionId` không hợp lệ.
- `404 Not Found`: không tìm thấy Lesson Plan.
- `409 Conflict`: `sessionId` đang được sử dụng bởi một phiên khác.

Lỗi xảy ra sau khi API trả `202` phải được gửi qua STOMP.

---

### 3. `GET /api/slides/sessions/{sessionId}`

Khôi phục trạng thái khi client reload trang hoặc mất kết nối WebSocket.

Response:

```http
200 OK
```

```json
{
  "sessionId": "session-uuid",
  "lessonPlanId": "lesson-plan-uuid",
  "status": "GENERATING",
  "totalSlides": 10,
  "completedSlides": 6,
  "failedSlides": 1,
  "deckId": null,
  "slides": [
    {
      "slideIndex": 0,
      "status": "READY",
      "slide": {
        "id": "slide-uuid",
        "slideIndex": 0,
        "title": "Câu hỏi mở đầu",
        "width": 960,
        "height": 540,
        "background": "#FFFFFF",
        "elements": []
      }
    },
    {
      "slideIndex": 1,
      "status": "FAILED",
      "errorCode": "AI_INVALID_RESPONSE",
      "message": "Không thể sinh nội dung slide."
    }
  ]
}
```

Trạng thái phiên:

```text
PENDING | GENERATING | COMPLETED | PARTIALLY_COMPLETED | FAILED
```

Trạng thái từng slide:

```text
PENDING | GENERATING | READY | FAILED
```

Lỗi:

- `404 Not Found`: không tìm thấy phiên hoặc phiên đã hết thời gian lưu.

---

### 4. `GET /api/slide-decks/{deckId}`

Lấy Slide Deck đã được lưu.

Response:

```http
200 OK
```

```json
{
  "id": "deck-uuid",
  "lessonPlanId": "lesson-plan-uuid",
  "title": "Định luật Ohm",
  "status": "COMPLETED",
  "createdAt": "2026-06-24T10:30:00Z",
  "slides": [
    {
      "id": "slide-uuid",
      "slideIndex": 0,
      "title": "Câu hỏi mở đầu",
      "kind": "CONTENT",
      "width": 960,
      "height": 540,
      "background": "#FFFFFF",
      "elements": []
    }
  ]
}
```

Lỗi:

- `404 Not Found`: không tìm thấy Slide Deck.

---

### 5. `POST /api/slide-decks/{deckId}/slides/{slideId}/regenerate`

Sinh lại một slide bị lỗi hoặc chưa đạt yêu cầu.

Client phải tạo một `sessionId` mới và subscribe STOMP trước khi gọi.

```json
{
  "sessionId": "new-session-uuid",
  "instruction": "Trình bày ngắn gọn hơn và thêm hình minh họa thực tế."
}
```

Response:

```http
202 Accepted
```

```json
{
  "sessionId": "new-session-uuid",
  "deckId": "deck-uuid",
  "slideId": "slide-uuid",
  "status": "GENERATING"
}
```

Slide mới thay thế slide cũ sau khi sinh thành công. Nếu sinh thất bại, backend giữ nguyên phiên bản slide trước đó.

Lỗi:

- `400 Bad Request`: thiếu `sessionId`.
- `404 Not Found`: không tìm thấy deck hoặc slide.
- `409 Conflict`: slide đang được sinh lại bởi một phiên khác.

---

## STOMP event contract

Endpoint kết nối:

```text
/ws
```

Topic:

```text
/topic/slides/{sessionId}
```

### `SLIDE_PART_READY`

```json
{
  "type": "SLIDE_PART_READY",
  "sessionId": "session-uuid",
  "slideIndex": 0,
  "slide": {
    "id": "slide-uuid",
    "slideIndex": 0,
    "title": "Câu hỏi mở đầu",
    "width": 960,
    "height": 540,
    "background": "#FFFFFF",
    "elements": []
  }
}
```

### `SLIDE_PART_FAILED`

```json
{
  "type": "SLIDE_PART_FAILED",
  "sessionId": "session-uuid",
  "slideIndex": 1,
  "errorCode": "AI_INVALID_RESPONSE",
  "message": "Không thể sinh nội dung slide."
}
```

### `DONE`

```json
{
  "type": "DONE",
  "sessionId": "session-uuid",
  "deckId": "deck-uuid",
  "status": "COMPLETED",
  "totalSlides": 10,
  "completedSlides": 10,
  "failedSlides": 0
}
```

`status` có thể là `COMPLETED` hoặc `PARTIALLY_COMPLETED`.

### `ERROR`

```json
{
  "type": "ERROR",
  "sessionId": "session-uuid",
  "errorCode": "GENERATION_FAILED",
  "message": "Không thể tiếp tục sinh Slide Deck."
}
```

`ERROR` chỉ dùng cho lỗi làm dừng toàn bộ phiên. Lỗi riêng của một slide dùng `SLIDE_PART_FAILED`.

---

## Trình tự gọi API

```text
1. FE gọi POST /api/slides/generate-outline.
2. FE hiển thị outline để người dùng thêm, sửa, xóa và đổi thứ tự slide.
3. FE tạo sessionId.
4. FE kết nối /ws và subscribe /topic/slides/{sessionId}.
5. FE gọi POST /api/slides/generate-parts với outline đã chỉnh sửa.
6. BE trả 202 và sinh các slide ở background.
7. BE gửi SLIDE_PART_READY hoặc SLIDE_PART_FAILED cho từng slide.
8. BE lưu Slide Deck và gửi DONE kèm deckId.
9. FE gọi GET /api/slide-decks/{deckId} để lấy bản đã lưu.
10. Nếu mất kết nối, FE gọi GET /api/slides/sessions/{sessionId}.
```

---

## Thành phần backend cần có

Theo layered architecture của dự án:

- `presentation`: `SlideController`, request/response DTO và STOMP event DTO.
- `service`: use case sinh outline, sinh slide parts, lấy session và regenerate slide.
- `domain`: `SlideOutline`, `SlideDeck`, `Slide`, `SlideElement`, trạng thái generation.
- `repository`: port lưu Slide Deck, quản lý generation session, gọi AI, lưu ảnh và publish event.
- `infrastructure`: AI adapter, JPA adapter, R2/image adapter và STOMP publisher.
- `config`: executor cho tác vụ sinh từng slide và bean wiring.

---

## Thứ tự triển khai đề xuất

1. Định nghĩa domain model và DTO cho outline, slide, element, deck và event.
2. Xây `POST /api/slides/generate-outline`.
3. Xây `POST /api/slides/generate-parts` cùng STOMP events.
4. Lưu Slide Deck và xây `GET /api/slide-decks/{deckId}`.
5. Xây generation-session store và `GET /api/slides/sessions/{sessionId}`.
6. Xây API regenerate một slide.

