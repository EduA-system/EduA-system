"use client";

/**
 * Vendor từ `katex/contrib/auto-render/splitAtDelimiters.ts` (KaTeX v0.16.47, MIT License,
 * Copyright (c) 2013-2020 Khan Academy and other contributors —
 * https://github.com/KaTeX/KaTeX/blob/master/contrib/auto-render/splitAtDelimiters.ts).
 *
 * Vendor thay vì `import` trực tiếp vì package `katex` không export public module này (bản
 * build sẵn `katex/contrib/auto-render` chỉ export `renderMathInElement`, thao túng DOM trực
 * tiếp — không phù hợp pipeline của dự án vốn build chuỗi HTML rồi mới `insertContentAt` vào
 * TipTap, xem `sectionDiff.ts`); import xuyên thẳng file nguồn TS trong node_modules không phải
 * API ổn định, dễ vỡ khi bump version katex — nên copy nguyên thuật toán (đã KaTeX team test kỹ
 * qua hàng loạt production case) làm code của dự án.
 *
 * Dùng để tách một chuỗi text tự do (do AI viết) thành các đoạn text/công thức xen kẽ, tolerant
 * với chữ đứng TRƯỚC/SAU dấu mở/đóng trên cùng một dòng — khác hẳn cách cũ của dự án
 * (`richParagraph` trong `LessonEditor.tsx`) vốn dùng regex bắt buộc CẢ DÒNG phải khớp
 * `^delimiter...delimiter$` mới nhận diện được công thức, nên vỡ ngay khi AI viết đúng cú pháp
 * nhưng thêm chú thích sau dấu đóng (vd "$$...$$ (với t ∈ R)."). `findEndOfMath` bên dưới còn
 * theo dõi độ sâu ngoặc nhọn `{`/`}` khi tìm dấu đóng — không bị cắt sớm bởi ký tự `]` xuất hiện
 * TRONG công thức (vd `[a, b]` trong nội dung), điều mà regex non-greedy cũ không đảm bảo được.
 */

export interface DelimiterSpec {
  left: string;
  right: string;
  display: boolean;
}

export interface SplitAtDelimiterData {
  type: "text" | "math";
  data: string;
  rawData?: string;
  display?: boolean;
}

const findEndOfMath = function (delimiter: string, text: string, startIndex: number): number {
  // Adapted from https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
  let index = startIndex;
  let braceLevel = 0;

  const delimLength = delimiter.length;

  while (index < text.length) {
    const character = text[index];

    if (braceLevel <= 0 && text.slice(index, index + delimLength) === delimiter) {
      return index;
    } else if (character === "\\") {
      index++;
    } else if (character === "{") {
      braceLevel++;
    } else if (character === "}") {
      braceLevel--;
    }

    index++;
  }

  return -1;
};

const escapeRegex = function (string: string): string {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const amsRegex = /^\\begin{/;

export default function splitAtDelimiters(text: string, delimiters: DelimiterSpec[]): SplitAtDelimiterData[] {
  let index;
  const data: SplitAtDelimiterData[] = [];

  const regexLeft = new RegExp("(" + delimiters.map((x) => escapeRegex(x.left)).join("|") + ")");

  while (true) {
    index = text.search(regexLeft);
    if (index === -1) {
      break;
    }
    if (index > 0) {
      data.push({
        type: "text",
        data: text.slice(0, index),
      });
      text = text.slice(index); // now text starts with delimiter
    }
    // ... so this always succeeds:
    const i = delimiters.findIndex((delim) => text.startsWith(delim.left));
    index = findEndOfMath(delimiters[i].right, text, delimiters[i].left.length);
    if (index === -1) {
      break;
    }
    const rawData = text.slice(0, index + delimiters[i].right.length);
    const math = amsRegex.test(rawData) ? rawData : text.slice(delimiters[i].left.length, index);
    data.push({
      type: "math",
      data: math,
      rawData,
      display: delimiters[i].display,
    });
    text = text.slice(index + delimiters[i].right.length);
  }

  if (text !== "") {
    data.push({
      type: "text",
      data: text,
    });
  }

  return data;
}
