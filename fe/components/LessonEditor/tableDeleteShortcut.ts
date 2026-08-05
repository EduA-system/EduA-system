import { Extension } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";

/**
 * Cho phép xoá cả bảng bằng phím như Google Docs: bôi đen toàn bộ các ô của bảng
 * rồi nhấn Backspace/Delete sẽ gỡ luôn cả khung bảng.
 *
 * Mặc định của ProseMirror khi bôi đen bảng là `CellSelection` (chọn *các ô*, không
 * phải node bảng), và Backspace/Delete chỉ xoá nội dung trong ô chứ không gỡ bảng.
 * Ta phát hiện lúc lựa chọn phủ hết cả cột lẫn hết hàng — tức toàn bộ bảng —
 * (`isColSelection() && isRowSelection()`) thì gọi `deleteTable()`.
 */
export const TableDeleteShortcut = Extension.create({
  name: "tableDeleteShortcut",

  addKeyboardShortcuts() {
    const deleteWholeTableIfSelected = () => {
      const { selection } = this.editor.state;
      if (
        selection instanceof CellSelection &&
        selection.isColSelection() &&
        selection.isRowSelection()
      ) {
        return this.editor.chain().focus().deleteTable().run();
      }
      return false;
    };

    return {
      Backspace: deleteWholeTableIfSelected,
      Delete: deleteWholeTableIfSelected,
    };
  },
});
