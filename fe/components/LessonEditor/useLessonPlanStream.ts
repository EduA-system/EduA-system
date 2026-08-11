"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import type {
  Activity5512,
  EquipmentAndMaterials,
  LessonPlan5512,
  Objectives,
} from "@/data/lessonPlan5512Mock";
import {
  clearLessonPlanSession,
  readLessonPlanSession,
  retryActivityDetail,
  type LessonPlanSession,
} from "@/services/lessonPlanService";
import { useAuth } from "@/lib/auth/AuthContext";
import { connectLessonPlanStream, lessonPlanTopic } from "@/lib/ws/lesson-plan-client";
import { activityHtml, lessonPlan5512ToHtml, lessonPlanErrorHtml } from "./LessonEditor";
import { LP_STREAM_META, type PendingActivityStatus } from "./pendingActivityNode";
import { setRetryHandler } from "./pendingActivityRetry";

/** Khung `FRAME_READY` được giữ lại để nút "Thử lại" gửi ngược lên làm ngữ cảnh soạn lại. */
type LessonPlanFrame = {
  objectives: Objectives;
  equipmentAndMaterials?: EquipmentAndMaterials;
  activities: Activity5512[];
};

/** Thay block (node `pendingActivity` theo `order`) trong editor bằng HTML thật. */
function replacePendingBlock(editor: Editor, order: number, html: string) {
  let target: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target) return false;
    if (node.type.name === "pendingActivity" && Number(node.attrs.order) === order) {
      target = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  if (!target) {
    console.warn("[lesson-edit] Không tìm thấy block đang soạn cho HĐ", order);
    return;
  }
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta(LP_STREAM_META, true);
      return true;
    })
    // preserveWhitespace:false để không sinh text-node thừa giữa các thẻ; nếu không
    // ProseMirror dễ nuốt mất <table> (bảng tiểu HĐ của HĐ2) khi parse slice để chèn.
    .insertContentAt(target, html, { parseOptions: { preserveWhitespace: false } })
    .run();
}

/**
 * Đổi trạng thái block `pendingActivity` theo `order` (giữ nguyên node → CÒN mỏ neo `order`
 * để retry patch đúng chỗ). Dùng cho ACTIVITY_FAILED và cho vòng "về spinner" khi bấm Thử lại.
 */
function setPendingStatus(
  editor: Editor,
  order: number,
  status: PendingActivityStatus,
  reason = "",
) {
  type Found = { pos: number; attrs: Record<string, unknown> };
  let target: Found | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target) return false;
    if (node.type.name === "pendingActivity" && Number(node.attrs.order) === order) {
      target = { pos, attrs: node.attrs };
      return false;
    }
    return true;
  });
  // Cast cần thiết: TS không theo được phép gán trong callback nên narrow `target` về `never`.
  const found = target as Found | null;
  if (!found) {
    console.warn("[lesson-edit] Không tìm thấy block đang soạn để đổi trạng thái cho HĐ", order);
    return;
  }
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta(LP_STREAM_META, true);
      tr.setNodeMarkup(found.pos, undefined, { ...found.attrs, status, reason });
      return true;
    })
    .run();
}

/**
 * Hook mở STOMP cho phiên sinh giáo án (đọc sessionId từ sessionStorage) và FILL DẦN
 * vào editor: FRAME_READY đổ khung (I + II + dàn ý III, các HĐ là block "đang soạn"),
 * mỗi ACTIVITY_READY/FAILED thay đúng block của HĐ đó. Không có phiên → giữ khung mock.
 */
export function useLessonPlanStream(
  editor: Editor | null,
  onComplete?: (session: LessonPlanSession) => void,
  onFinished?: () => void,
  enabled = true,
) {
  const { accessToken, status } = useAuth();
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);
  // Token mới nhất cho nút "Thử lại" (retry có thể xảy ra lâu sau khi mở stream, token có thể
  // đã refresh) — đọc qua ref để không phụ thuộc closure cũ của effect.
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);
  // Ngữ cảnh giữ lại để retry soạn lại một hoạt động mà không mất context.
  const sessionRef = useRef<LessonPlanSession | null>(null);
  const frameRef = useRef<LessonPlanFrame | null>(null);
  // Chặn bấm "Thử lại" trùng cho cùng một order khi đang chạy.
  const inFlightRef = useRef<Set<number>>(new Set());
  // Đánh dấu khung (I/II/III-skeleton) đã từng về — dùng để quyết định có nên
  // ghi đè toàn bộ tài liệu bằng thông báo lỗi hay không (khung về rồi thì giữ
  // nguyên phần đã render, không phá dữ liệu GV có thể đã bắt đầu chỉnh sửa).
  const frameReceivedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !editor || startedRef.current) return;

    // Đợi AuthProvider hoàn tất refresh phiên. STOMP bắt buộc có JWT nên không được
    // mở socket trong lúc token còn null.
    if (status === "loading") return;

    if (status !== "authenticated" || !accessToken) {
      console.error("[lesson-edit] Không thể mở stream: chưa đăng nhập.");
      return;
    }

    const session = readLessonPlanSession();
    if (!session) {
      console.log("[lesson-edit] Không có phiên streaming — giữ khung mặc định.");
      return;
    }
    startedRef.current = true;
    // Tiêu thụ phiên ngay để reload trang không mở lại stream (đã/đang chạy).
    clearLessonPlanSession();
    // Giữ phiên cho nút "Thử lại" (bookId/chapterId/lessonId/userPrompt).
    sessionRef.current = session;

    console.log(
      "%c[lesson-edit] Mở stream giáo án",
      "color:#1565c0;font-weight:bold",
      session,
    );

    // Đặt true trong cleanup (unmount/điều hướng đi) TRƯỚC khi disconnect, để
    // onClose không cố sửa một editor sắp/đã bị huỷ.
    let cancelled = false;

    const showErrorFallback = (message?: string) => {
      if (frameReceivedRef.current || editor.isDestroyed) return;
      editor.setEditable(true);
      editor.commands.setContent(lessonPlanErrorHtml(session.display, message));
    };

    const { disconnect } = connectLessonPlanStream({
      topic: lessonPlanTopic(session.sessionId),
      accessToken,
      onEvent: (event) => {
        switch (event.type) {
          case "FRAME_READY": {
            frameReceivedRef.current = true;
            const frame = event.frame;
            const skeleton =
              frame.activities && frame.activities.length > 0
                ? frame.activities
                : lessonPlan5512Mock.activities;
            const merged: LessonPlan5512 = {
              ...lessonPlan5512Mock,
              title: frame.title ?? session.display?.title ?? lessonPlan5512Mock.title,
              metadata: {
                ...lessonPlan5512Mock.metadata,
                subject: session.display?.subject
                  ? `Môn học/Hoạt động giáo dục: ${session.display.subject}`
                  : lessonPlan5512Mock.metadata.subject,
                grade: session.display?.grade ?? lessonPlan5512Mock.metadata.grade,
                duration: session.display?.duration ?? lessonPlan5512Mock.metadata.duration,
              },
              objectives: frame.objectives ?? lessonPlan5512Mock.objectives,
              equipmentAndMaterials:
                frame.equipmentAndMaterials ?? lessonPlan5512Mock.equipmentAndMaterials,
              activities: skeleton,
            };
            const pendingOrders = new Set(skeleton.map((a) => a.order));
            // Giữ khung để nút "Thử lại" gửi lại làm ngữ cảnh (dùng dàn ý ĐÃ RENDER nên order
            // khớp các block pending trên editor).
            frameRef.current = {
              objectives: frame.objectives ?? lessonPlan5512Mock.objectives,
              equipmentAndMaterials: frame.equipmentAndMaterials,
              activities: skeleton,
            };
            console.log("%c← FRAME_READY", "color:#1565c0;font-weight:bold", {
              title: frame.title,
              objectives: frame.objectives,
              equipmentAndMaterials: frame.equipmentAndMaterials,
              activities: skeleton,
            });
            editor.commands.setContent(lessonPlan5512ToHtml(merged, { pendingOrders }));
            // Mở khoá I/II ngay (đã về đầy đủ); III vẫn khoá theo từng hoạt động
            // qua node `pendingActivity` cho tới khi ACTIVITY_READY/FAILED.
            editor.setEditable(true);
            break;
          }
          case "ACTIVITY_READY": {
            const order = Number(event.activityId);
            console.groupCollapsed(`← ACTIVITY_READY HĐ${order}: ${event.activity.name}`);
            console.log("a) Mục tiêu:", event.activity.objective);
            console.log("b) Nội dung:", event.activity.content);
            console.log("c) Sản phẩm:", event.activity.product);
            console.log("d) Tổ chức thực hiện:", event.activity.organization);
            if (event.activity.subActivities?.length) {
              console.log("Tiểu hoạt động:", event.activity.subActivities);
            }
            console.groupEnd();
            replacePendingBlock(editor, order, activityHtml(event.activity));
            break;
          }
          case "ACTIVITY_FAILED": {
            const order = Number(event.activityId);
            console.warn(`← ACTIVITY_FAILED HĐ${order}:`, event.reasons);
            // GIỮ node `pendingActivity` (đổi status=failed) để còn mỏ neo `order` — NodeView
            // hiện nút "Thử lại", retry patch lại đúng chỗ này.
            setPendingStatus(editor, order, "failed", (event.reasons ?? []).join("; "));
            break;
          }
          case "DONE": {
            console.log(
              "%c← DONE — giáo án đã sinh xong",
              "color:#2e7d32;font-weight:bold",
              event,
            );
            onFinishedRef.current?.();
            onCompleteRef.current?.(session);
            break;
          }
          case "ERROR": {
            console.error("← ERROR khi sinh giáo án:", event.message);
            showErrorFallback(event.message);
            onFinishedRef.current?.();
            break;
          }
        }
      },
      onClose: () => {
        console.log("[lesson-edit] stream đóng.");
        // Mất kết nối (onDisconnect/onStompError) mà chưa từng nhận FRAME_READY hay
        // ERROR tường minh — coi như thất bại, mở khoá thay vì kẹt vĩnh viễn.
        if (!cancelled) {
          showErrorFallback();
          onFinishedRef.current?.();
        }
      },
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [accessToken, editor, enabled, status]);

  // Đăng ký handler "Thử lại" theo VÒNG ĐỜI EDITOR (không gắn với effect stream, vì effect đó
  // early-return khi token refresh → sẽ mất handler). Đọc ngữ cảnh qua ref nên luôn mới nhất.
  useEffect(() => {
    if (!editor) return;

    const handleRetry = async (order: number) => {
      const currentSession = sessionRef.current;
      const frame = frameRef.current;
      const token = accessTokenRef.current;
      if (!currentSession || !frame || !token) {
        console.warn("[lesson-edit] Thiếu ngữ cảnh để thử lại HĐ", order);
        return;
      }
      const skeleton = frame.activities.find((a) => a.order === order);
      if (!skeleton) {
        console.warn("[lesson-edit] Không tìm thấy dàn ý HĐ", order, "để thử lại.");
        return;
      }
      if (inFlightRef.current.has(order)) return;
      inFlightRef.current.add(order);
      setPendingStatus(editor, order, "pending");
      try {
        const activity = await retryActivityDetail(
          {
            bookId: currentSession.bookId,
            chapterId: currentSession.chapterId,
            lessonId: currentSession.lessonId,
            userPrompt: currentSession.userPrompt,
            objectives: frame.objectives,
            equipmentAndMaterials: frame.equipmentAndMaterials,
            activities: [skeleton],
          },
          token,
        );
        if (editor.isDestroyed) return;
        console.log(`%c↻ RETRY OK HĐ${order}: ${activity.name}`, "color:#2e7d32;font-weight:bold");
        replacePendingBlock(editor, order, activityHtml(activity));
      } catch (error) {
        if (editor.isDestroyed) return;
        const message = error instanceof Error ? error.message : "Soạn lại thất bại.";
        console.warn(`↻ RETRY FAILED HĐ${order}:`, message);
        setPendingStatus(editor, order, "failed", message);
      } finally {
        inFlightRef.current.delete(order);
      }
    };

    setRetryHandler(editor, (order) => {
      void handleRetry(order);
    });
    return () => {
      setRetryHandler(editor, null);
    };
  }, [editor]);
}
