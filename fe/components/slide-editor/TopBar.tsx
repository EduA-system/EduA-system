// Thanh công cụ trên của editor. Bước 1: để trống, chừa chỗ cho tool
// (undo/redo, zoom, thêm chữ/hình/ảnh, export…).

export function TopBar() {
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-black/10 bg-white px-4">
      <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#1f1f1f]">
        Slide Maker
      </span>
      {/* chừa chỗ cho tool */}
      <div className="flex-1" />
    </header>
  );
}
