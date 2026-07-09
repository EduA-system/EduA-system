"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import type { LessonPlan5512 } from "@/data/lessonPlan5512Mock";
import {
  clearLessonPlanSession,
  readLessonPlanSession,
} from "@/services/lessonPlanService";
import { useAuth } from "@/lib/auth/AuthContext";
import { connectLessonPlanStream, lessonPlanTopic } from "@/lib/ws/lesson-plan-client";
import { activityHtml, lessonPlan5512ToHtml, lessonPlanErrorHtml } from "./LessonEditor";
import { LP_STREAM_META } from "./pendingActivityNode";

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
 * Hook mở STOMP cho phiên sinh giáo án (đọc sessionId từ sessionStorage) và FILL DẦN
 * vào editor: FRAME_READY đổ khung (I + II + dàn ý III, các HĐ là block "đang soạn"),
 * mỗi ACTIVITY_READY/FAILED thay đúng block của HĐ đó. Không có phiên → giữ khung mock.
 */
export function useLessonPlanStream(editor: Editor | null) {
  const { accessToken } = useAuth();
  const startedRef = useRef(false);
  // Đánh dấu khung (I/II/III-skeleton) đã từng về — dùng để quyết định có nên
  // ghi đè toàn bộ tài liệu bằng thông báo lỗi hay không (khung về rồi thì giữ
  // nguyên phần đã render, không phá dữ liệu GV có thể đã bắt đầu chỉnh sửa).
  const frameReceivedRef = useRef(false);

  useEffect(() => {
    if (!editor || startedRef.current) return;

    const session = readLessonPlanSession();
    if (!session) {
      console.log("[lesson-edit] Không có phiên streaming — giữ khung mặc định.");
      return;
    }
    startedRef.current = true;
    // Tiêu thụ phiên ngay để reload trang không mở lại stream (đã/đang chạy).
    clearLessonPlanSession();

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
            const note =
              '<p class="lp-failed">⚠️ Chưa soạn được nội dung — mời soạn tay.</p>';
            replacePendingBlock(editor, order, note);
            break;
          }
          case "DONE": {
            console.log(
              "%c← DONE — giáo án đã sinh xong",
              "color:#2e7d32;font-weight:bold",
              event,
            );
            break;
          }
          case "ERROR": {
            console.error("← ERROR khi sinh giáo án:", event.message);
            showErrorFallback(event.message);
            break;
          }
        }
      },
      onClose: () => {
        console.log("[lesson-edit] stream đóng.");
        // Mất kết nối (onDisconnect/onStompError) mà chưa từng nhận FRAME_READY hay
        // ERROR tường minh — coi như thất bại, mở khoá thay vì kẹt vĩnh viễn.
        if (!cancelled) showErrorFallback();
      },
    });

    return () => {
      cancelled = true;
      disconnect();
    };
  }, [accessToken, editor]);
}
