"use client";

// Menu chuột phải (port từ /test-slide). Render qua portal ở toạ độ con trỏ.

import { createPortal } from "react-dom";

export interface CtxMenuState {
  x: number;
  y: number;
  isCanvas: boolean;
}

type Item =
  | { sep: true }
  | { label: string; action: string; key?: string; danger?: boolean };

const CANVAS_ITEMS: Item[] = [
  { label: "Dán", action: "paste", key: "Ctrl+V" },
  { sep: true },
  { label: "Chọn tất cả", action: "selectAll", key: "Ctrl+A" },
];

const ELEMENT_ITEMS: Item[] = [
  { label: "Sao chép", action: "copy", key: "Ctrl+C" },
  { label: "Nhân đôi", action: "duplicate", key: "Ctrl+D" },
  { label: "Dán", action: "paste", key: "Ctrl+V" },
  { sep: true },
  { label: "Xóa", action: "delete", key: "Del", danger: true },
  { sep: true },
  { label: "Lên trên", action: "zUp", key: "]" },
  { label: "Xuống dưới", action: "zDown", key: "[" },
  { sep: true },
  { label: "Nhóm", action: "group", key: "Ctrl+G" },
  { label: "Bỏ nhóm", action: "ungroup", key: "Ctrl+Shift+G" },
  { sep: true },
  { label: "Khóa / Mở khóa", action: "lock", key: "Ctrl+L" },
];

export function ContextMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: CtxMenuState;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const items = menu.isCanvas ? CANVAS_ITEMS : ELEMENT_ITEMS;

  return createPortal(
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 99997 }}
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        style={{
          position: "fixed",
          left: menu.x,
          top: menu.y,
          zIndex: 99998,
          minWidth: 200,
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          padding: "4px 0",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((item, i) =>
          "sep" in item ? (
            <div key={i} style={{ height: 1, background: "#e2e8f0", margin: "3px 0" }} />
          ) : (
            <button
              key={i}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: item.danger ? "#dc2626" : "#334155",
                fontSize: 13,
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              onClick={() => {
                onAction(item.action);
                onClose();
              }}
            >
              <span>{item.label}</span>
              {item.key && (
                <span style={{ fontSize: 11, color: "#64748b", marginLeft: 24 }}>{item.key}</span>
              )}
            </button>
          )
        )}
      </div>
    </>,
    document.body
  );
}
