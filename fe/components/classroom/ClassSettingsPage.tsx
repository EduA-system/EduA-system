"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Archive, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  isClassSubject,
  type ClassDetail,
  type ClassStatus,
  getClassDetail,
  subjectLabel,
  updateClass,
  updateClassStatus,
  type UpdateClassPayload,
} from "@/lib/classroom";
import { ClassHubFrame } from "./ClassHubFrame";

const grades = [10, 11, 12];

export function ClassSettingsPage() {
  const { authFetch, user } = useAuth();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<UpdateClassPayload | null>(null);
  const ownSubject = isClassSubject(user?.subject) ? user.subject : null;
  const legacySubject = detail && detail.subject !== ownSubject ? detail.subject : null;

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      setDetail(await getClassDetail(authFetch, classId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải cài đặt lớp.");
    }
  }, [authFetch, classId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || detail.status === "INACTIVE" || !ownSubject) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const grade = Number(data.get("grade"));
    if (!name) {
      setError("Tên lớp là trường bắt buộc.");
      return;
    }
    if (!grades.includes(grade)) {
      setError("Khối là trường bắt buộc.");
      return;
    }
    setError("");
    setPendingUpdate({
      name,
      grade,
      description: String(data.get("description") ?? "").trim() || null,
      ...(ownSubject === detail.subject ? { subject: ownSubject } : {}),
    });
  }

  async function confirmSave() {
    if (!detail || !pendingUpdate) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateClass(authFetch, detail.id, pendingUpdate);
      setDetail(updated);
      setMessage("Đã lưu thay đổi lớp.");
      setPendingUpdate(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu lớp.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    if (!detail || saving) return;
    setSaving(true);
    try {
      const next: ClassStatus = detail.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      setDetail(await updateClassStatus(authFetch, detail.id, next));
      setMessage(next === "ACTIVE" ? "Đã kích hoạt lại lớp." : "Lớp đã chuyển sang chế độ chỉ đọc.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái lớp.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ClassHubFrame classId={classId} active="settings" header={<div><h1 className="font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Cài đặt lớp</h1><p className="mt-3 text-[14px] leading-6 text-[#6b6b6b]">Cập nhật thông tin hoặc thay đổi trạng thái lớp.</p></div>}>
      <div className="max-w-[680px]">
        {error && <p className="mt-4 text-[13px] text-[#c0492b]">{error}</p>}
        {message && <p className="mt-4 flex items-center gap-2 text-[13px] text-[#287447]"><CheckCircle2 className="size-4" />{message}</p>}
        {!detail ? <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : (
          <form onSubmit={submit} className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
            <label className="block text-[12px] font-medium text-[#6b6b6b]">Tên lớp <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><input name="name" defaultValue={detail.name} disabled={detail.status === "INACTIVE"} required className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] disabled:text-[#8a837b]" /></label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[12px] font-medium text-[#6b6b6b]">Môn <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><div className="mt-2 flex h-10 items-center rounded-lg border border-[#d8d1c9] bg-[#f3f0ec] px-3 text-[13px] text-[#4f4943]">{subjectLabel(detail.subject)}</div></label>
              <label className="text-[12px] font-medium text-[#6b6b6b]">Khối <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><select name="grade" defaultValue={detail.grade} disabled={detail.status === "INACTIVE"} required className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px]">{grades.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}</select></label>
            </div>
            {legacySubject && <p className="mt-3 text-[12px] text-[#8a5a35]">Lớp này được tạo trước khi giới hạn chuyên ngành được áp dụng; môn học hiện tại được giữ nguyên.</p>}
            <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">Mô tả<textarea name="description" defaultValue={detail.description ?? ""} disabled={detail.status === "INACTIVE"} rows={5} className="mt-2 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2 text-[13px] disabled:text-[#8a837b]" /></label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={saving || detail.status === "INACTIVE" || ownSubject === null} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1f1f1f] px-4 text-[13px] font-medium text-white disabled:opacity-50"><Save className="size-4" /> Lưu thông tin</button>
              <button type="button" onClick={() => void toggle()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d8d1c9] px-4 text-[13px] font-medium"><>{detail.status === "ACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}</> {detail.status === "ACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}</button>
            </div>
            {ownSubject === null && <p className="mt-4 text-[12px] text-[#c0492b]">Tài khoản chưa có chuyên ngành nên chưa thể chỉnh sửa lớp.</p>}
            {detail.status === "INACTIVE" && <p className="mt-4 text-[12px] text-[#8a5a35]">Lớp đang ở chế độ chỉ đọc. Kích hoạt lại để chỉnh sửa.</p>}
          </form>
        )}
      </div>
      {pendingUpdate && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-class-save-title"><div className="w-full max-w-md rounded-[14px] border border-[#d8d1c9] bg-white p-5 shadow-xl"><h2 id="confirm-class-save-title" className="text-[18px] font-semibold">Lưu thay đổi lớp?</h2><p className="mt-2 text-[13px] leading-6 text-[#6b6b6b]">Thông tin lớp sẽ được cập nhật cho các thành viên trong lớp.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setPendingUpdate(null)} disabled={saving} className="h-9 rounded-[10px] border border-[#d8d1c9] px-3 text-[12px] font-medium disabled:opacity-50">Hủy</button><button type="button" onClick={() => void confirmSave()} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#1f1f1f] px-3 text-[12px] font-medium text-white disabled:opacity-50">{saving && <Loader2 className="size-3.5 animate-spin" />} Xác nhận lưu</button></div></div></div>}
    </ClassHubFrame>
  );
}
