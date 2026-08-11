"use client";

import { type ReactNode, useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmDialogVariant = "default" | "danger" | "success";

function variantClasses(variant: ConfirmDialogVariant) {
  if (variant === "danger") {
    return {
      icon: "bg-[#fdf3ef] text-[#c0492b]",
      button: "bg-[#c0492b] text-white hover:bg-[#a93d24]",
    };
  }
  if (variant === "success") {
    return {
      icon: "bg-emerald-50 text-emerald-700",
      button: "bg-emerald-600 text-white hover:bg-emerald-700",
    };
  }
  return {
    icon: "bg-[#fff7f2] text-[#d97757]",
    button: "bg-[#1f1f1f] text-white hover:bg-[#34312e]",
  };
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  variant = "default",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const titleId = useId();
  const classes = variantClasses(variant);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="presentation" onClick={loading ? undefined : onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-[#ede8e1] px-5 py-4">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${classes.icon}`}>
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold leading-6 text-[#1f1f1f]">
              {title}
            </h2>
            <div className="mt-1 text-sm leading-6 text-[#6b6b6b]">{description}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8a837b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#d8d1c9] bg-white px-4 py-2 text-sm font-medium text-[#4f4943] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${classes.button}`}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type TextPromptDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  minLength?: number;
  onConfirm: (value: string) => void;
  onClose: () => void;
};

export function TextPromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  loading = false,
  minLength = 1,
  onConfirm,
  onClose,
}: TextPromptDialogProps) {
  const titleId = useId();
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" role="presentation" onClick={loading ? undefined : onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#ede8e1] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-base font-semibold leading-6 text-[#1f1f1f]">
                {title}
              </h2>
              {description ? <div className="mt-1 text-sm leading-6 text-[#6b6b6b]">{description}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Đóng"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#8a837b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4">
          <label className="block text-sm font-medium text-[#4f4943]">
            {label}
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={placeholder}
              rows={4}
              autoFocus
              className="mt-2 w-full resize-none rounded-xl border border-[#d8d1c9] bg-[#fffdfb] px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#ede8e1] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-[#d8d1c9] bg-white px-4 py-2 text-sm font-medium text-[#4f4943] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={loading || trimmed.length < minLength}
            className="inline-flex items-center gap-2 rounded-lg bg-[#c0492b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a93d24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
