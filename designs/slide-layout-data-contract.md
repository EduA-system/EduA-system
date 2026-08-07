# Data contract cho layout slide động

## Luồng chuẩn

```text
Outline semantic → SlideItem.contentPlan → SlideLayoutInput
→ layout engine TypeScript → SlideLayoutResult
→ editor elements + content slots → AI điền nội dung Bước 3
```

Bước 2 không gọi AI, không dùng template và không sinh HTML. `title` của `SlideItem` là nguồn tiêu đề duy nhất; adapter tạo hero block runtime, không lưu title block trong outline.

## SlideItem

```ts
type SlideItem = {
  id: string;
  title: string;
  pedagogicalRole: string;
  durationMinutes?: number;
  aiNote?: string;
  contentPlan: {
    slideType: SlideType;
    headerMode: "fixed" | "hidden";
    blocks: ContentBlock[];
    relationships: ContentRelationship[];
  };
};
```

`SlideType` gồm `intro`, `section`, `concept`, `text-image`, `experiment`, `comparison`, `table`, `process`, `formula`, `exercise`, `quiz`, `summary`.

Không hỗ trợ các field cũ `kind`, `layoutHint`, `layoutVariant`, `content`, `requiredFacts`, `quizItems`, `visual`. Response thiếu `contentPlan` bị từ chối.

## ContentBlock

Mọi block có `id`, `kind`, `role`, `semanticType`, `priority`, `required`, và `groupId?`.

- `text`: `text`.
- `visual`: `description`, `requirement`, `preferredAspectRatio?`.
- `comparison`: `items`, `criteria`, `values`, `preferredPresentation`. Ma trận `values` phải đúng số criteria × items.
- `table`: `columns`, `rows`; mỗi row phải có đúng số cell bằng số column.
- `sequence`: `steps`; thứ tự mảng là thứ tự bắt buộc.
- `formula`: `expression`, `explanation?`.
- `quiz`: `question`, `choices?`, `answer?`, `explanation?`.

Quan hệ được giới hạn ở `illustrates`, `supports`, `follows`; mọi reference phải trỏ tới block ID tồn tại.

## Runtime input

`SlideLayoutInput` bổ sung `deckSeed`, `runNonce`, `algorithmVersion`, canvas 960×540, `bodyTop` và `density`. Adapter tự tính density/text demand; AI không trả geometry hoặc score.

Mỗi lần chạy Bước 2 sinh một `runNonce` mới cho toàn deck. Seed slide là FNV-1a của deck seed, slide ID, nonce và algorithm version. Cùng input và nonce luôn tạo cùng kết quả.

## Layout output

`SlideLayoutResult` chứa:

- `family`, `topology`, `seed`, `headerMode`, `contentBounds`;
- `structures`: card, panel, divider, rail hoặc table-grid;
- `slots`: source block/part, source text, zone, rectangle, style token và budget gợi ý;
- score thành phần và warnings.

Slot gửi Bước 3 có `id`, `kind`, `zone`, `sourceBlockId`, `sourcePartId?`, `sourceText`, `maxChars`, `maxLines`, `hint`. Hai budget chỉ hướng dẫn prompt; backend không cắt nội dung theo budget.

Sau fill, frontend đo `textBoxMinHeight()` và chỉ tăng `h`. Không giảm font, không cắt chữ, không reflow và cho phép box vượt canvas hoặc chồng element.

