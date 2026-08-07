"use client";

import { type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClassName?: string;
};

export function Modal({ open, onClose, title, description, children, maxWidthClassName = "max-w-lg" }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`flex w-full ${maxWidthClassName} max-h-[90vh] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#f0ece5] px-6 py-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-[#6b6b6b]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="shrink-0 rounded-full p-1.5 text-[#8a8178] transition hover:bg-[#f5f1ec] hover:text-[#2b2926]"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
