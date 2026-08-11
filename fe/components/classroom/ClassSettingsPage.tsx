"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CheckCircle2, Loader2, RefreshCw, Save } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

const GRADES = [10, 11, 12] as const;

export function ClassSettingsPage() {
  const { authFetch, user } = useAuth();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<UpdateClassPayload | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ClassStatus | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | "">("");
  const ownSubject = isClassSubject(user?.subject) ? user.subject : null;
  const legacySubject = detail && detail.subject !== ownSubject ? detail.subject : null;
  const allowedGrades = useMemo(
    () => (user?.grades ?? []).filter((grade): grade is number => GRADES.includes(grade as (typeof GRADES)[number])),
    [user?.grades],
  );

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      setDetail(await getClassDetail(authFetch, classId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải cài đặt lớp.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!detail) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedGrade("");
      return;
    }
    setSelectedGrade(allowedGrades.includes(detail.grade) ? detail.grade : "");
  }, [allowedGrades, detail]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail || detail.status === "INACTIVE" || !ownSubject) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const grade = selectedGrade;
    if (!name) {
      setError("Tên lớp là trường bắt buộc.");
      return;
    }
    if (grade === "" || !allowedGrades.includes(grade)) {
      setError("Bạn chỉ được chọn khối mình phụ trách.");
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

  function requestToggle() {
    if (!detail || saving) return;
    setPendingStatus(detail.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
  }

  async function confirmToggle() {
    if (!detail || !pendingStatus || saving) return;
    setSaving(true);
    try {
      setDetail(await updateClassStatus(authFetch, detail.id, pendingStatus));
      setMessage(pendingStatus === "ACTIVE" ? "Đã kích hoạt lại lớp." : "Lớp đã chuyển sang chế độ chỉ đọc.");
      setPendingStatus(null);
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
        {loading ? <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : !detail ? (
          <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-14 text-center text-[13px] text-[#6b6b6b]">Không tìm thấy lớp học.</div>
        ) : (
          <form onSubmit={submit} className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
            <label className="block text-[12px] font-medium text-[#6b6b6b]">Tên lớp <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><input name="name" defaultValue={detail.name} disabled={detail.status === "INACTIVE"} required className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] disabled:text-[#8a837b]" /></label>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-[12px] font-medium text-[#6b6b6b]">Môn <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><div className="mt-2 flex h-10 items-center rounded-lg border border-[#d8d1c9] bg-[#f3f0ec] px-3 text-[13px] text-[#4f4943]">{subjectLabel(detail.subject)}</div></label>
              <label className="text-[12px] font-medium text-[#6b6b6b]">Khối <span className="text-[#c0492b]" aria-label="Bắt buộc">*</span><select name="grade" value={selectedGrade} onChange={(event) => setSelectedGrade(event.target.value ? Number(event.target.value) : "")} disabled={detail.status === "INACTIVE" || allowedGrades.length === 0} required className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px]"><option value="">{allowedGrades.length === 0 ? "Chưa được phân công khối" : "Chọn khối phụ trách"}</option>{allowedGrades.map((grade) => <option key={grade} value={grade}>Khối {grade}</option>)}</select></label>
            </div>
            {legacySubject && <p className="mt-3 text-[12px] text-[#8a5a35]">Lớp này được tạo trước khi giới hạn chuyên ngành được áp dụng; môn học hiện tại được giữ nguyên.</p>}
            {detail.grade && !allowedGrades.includes(detail.grade) && <p className="mt-3 text-[12px] text-[#8a5a35]">Khối hiện tại của lớp là {detail.grade}, nhưng tài khoản của bạn không còn được phân công khối này. Hãy chọn một khối đang phụ trách để lưu thay đổi.</p>}
            <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">Mô tả<textarea name="description" defaultValue={detail.description ?? ""} disabled={detail.status === "INACTIVE"} rows={5} className="mt-2 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2 text-[13px] disabled:text-[#8a837b]" /></label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button disabled={saving || detail.status === "INACTIVE" || ownSubject === null || selectedGrade === ""} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#1f1f1f] px-4 text-[13px] font-medium text-white disabled:opacity-50"><Save className="size-4" /> Lưu thông tin</button>
              <button type="button" onClick={requestToggle} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d8d1c9] px-4 text-[13px] font-medium"><>{detail.status === "ACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}</> {detail.status === "ACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}</button>
            </div>
            {ownSubject === null && <p className="mt-4 text-[12px] text-[#c0492b]">Tài khoản chưa có chuyên ngành nên chưa thể chỉnh sửa lớp.</p>}
            {allowedGrades.length === 0 && <p className="mt-4 text-[12px] text-[#c0492b]">Tài khoản chưa được phân công khối nên chưa thể chỉnh sửa lớp.</p>}
            {detail.status === "INACTIVE" && <p className="mt-4 text-[12px] text-[#8a5a35]">Lớp đang ở chế độ chỉ đọc. Kích hoạt lại để chỉnh sửa.</p>}
          </form>
        )}
      </div>
      <ConfirmDialog
        open={pendingUpdate !== null}
        title="Lưu thay đổi lớp?"
        description="Thông tin lớp sẽ được cập nhật cho các thành viên trong lớp."
        confirmLabel="Xác nhận lưu"
        loading={saving}
        onConfirm={() => void confirmSave()}
        onClose={() => setPendingUpdate(null)}
      />
      <ConfirmDialog
        open={pendingStatus !== null}
        title={pendingStatus === "ACTIVE" ? "Kích hoạt lại lớp?" : "Lưu trữ lớp?"}
        description={pendingStatus === "ACTIVE"
          ? "Lớp sẽ được mở lại để giáo viên tiếp tục chỉnh sửa và quản lý."
          : "Lớp sẽ chuyển sang chế độ chỉ đọc. Bạn có thể kích hoạt lại sau nếu cần."}
        confirmLabel={pendingStatus === "ACTIVE" ? "Kích hoạt lại" : "Lưu trữ lớp"}
        variant={pendingStatus === "ACTIVE" ? "success" : "danger"}
        loading={saving}
        onConfirm={() => void confirmToggle()}
        onClose={() => setPendingStatus(null)}
      />
    </ClassHubFrame>
  );
}
