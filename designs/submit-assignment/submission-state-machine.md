# State machine — Trạng thái bài nộp

```mermaid
stateDiagram-v2
    [*] --> NOT_APPLICABLE: Tài nguyên không yêu cầu nộp bài
    [*] --> NOT_SUBMITTED: Tài nguyên yêu cầu nộp bài

    NOT_SUBMITTED --> ON_TIME: Nộp bài trước hoặc đúng hạn
    NOT_SUBMITTED --> LATE: Nộp bài sau hạn

    ON_TIME --> ON_TIME: Nộp lại trước hoặc đúng hạn
    ON_TIME --> LATE: Nộp lại sau hạn
    LATE --> LATE: Nộp lại

    ON_TIME --> NOT_SUBMITTED: Thu hồi bài nộp
    LATE --> NOT_SUBMITTED: Thu hồi bài nộp
```

- `NOT_APPLICABLE`: tài nguyên không bật `submissionEnabled`.
- `NOT_SUBMITTED`: chưa có bài nộp đang hoạt động.
- `ON_TIME`: bài được nộp trước hoặc đúng hạn.
- `LATE`: bài được nộp sau hạn.

Nộp lại thay thế bài nộp hiện tại; thu hồi xóa bài nộp và trở về `NOT_SUBMITTED`.
