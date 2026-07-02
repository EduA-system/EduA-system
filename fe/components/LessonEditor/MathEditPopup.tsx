"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { MathClickInfo } from "./editorConfig";

/**
 * Popup sửa/xoá một công thức đã render trong editor — mở khi bấm vào node
 * `inline-math`/`block-math` (xem `onMathClick` trong `editorConfig.ts`).
 * Vì node là atom (không gõ chữ được bên trong), đây là cách duy nhất giáo
 * viên chỉnh sửa LaTeX của công thức AI đã sinh mà không phải xoá-chèn-lại.
 */
export function MathEditPopup({
  editor,
  info,
  onClose,
}: {
  editor: Editor;
  info: MathClickInfo;
  onClose: () => void;
}) {
  const [latex, setLatex] = useState(info.latex);

  const applyUpdate = () => {
    const trimmed = latex.trim();
    if (!trimmed) return;
    const chain = editor.chain().focus();
    if (info.display) chain.updateBlockMath({ latex: trimmed, pos: info.pos }).run();
    else chain.updateInlineMath({ latex: trimmed, pos: info.pos }).run();
    onClose();
  };

  const applyDelete = () => {
    const chain = editor.chain().focus();
    if (info.display) chain.deleteBlockMath({ pos: info.pos }).run();
    else chain.deleteInlineMath({ pos: info.pos }).run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#2b2926]/20"
      onMouseDown={onClose}
    >
      <div
        className="w-[360px] rounded-xl border border-[#e8e2d9] bg-white p-3 shadow-[0_8px_24px_rgba(43,41,38,0.16)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 text-[13px] font-medium text-[#2b2926]">
          Sửa công thức {info.display ? "(dạng khối)" : "(dạng dòng)"}
        </div>
        <input
          autoFocus
          value={latex}
          onChange={(event) => setLatex(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") applyUpdate();
            if (event.key === "Escape") onClose();
          }}
          className="h-8 w-full rounded-lg border border-[#e8e2d9] px-2 text-[13px] text-[#2b2926] outline-none focus:border-[#d97757]"
        />
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyDelete}
            className="h-7 rounded-lg px-2.5 text-[12px] text-[#b4472e] transition hover:bg-[#fbeee9]"
          >
            Xoá công thức
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClose}
            className="h-7 rounded-lg px-2.5 text-[12px] text-[#6b625a] transition hover:bg-[#f7f3ee]"
          >
            Huỷ
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={applyUpdate}
            className="h-7 rounded-lg bg-[#d97757] px-3 text-[12px] font-medium text-white transition hover:bg-[#c96545]"
          >
            Cập nhật
          </button>
        </div>
      </div>
    </div>
  );
}
