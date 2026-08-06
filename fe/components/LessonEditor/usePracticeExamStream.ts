"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  clearPracticeExamSession,
  readPracticeExamSession,
  regenerateQuestion,
  type PracticeExam,
  type PracticeExamSession,
  type PracticeQuestionType,
} from "@/services/practiceExamService";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  connectPracticeExamStream,
  practiceExamTopic,
  type PracticeExamQuestionStub,
} from "@/lib/ws/practice-exam-client";
import { answersSectionHtml, examErrorHtml, examSkeletonHtml, questionContentHtml } from "@/lib/practice-exam-html";
import { PE_STREAM_META, type PendingQuestionStatus } from "./pendingQuestionNode";
import { setQuestionRetryHandler } from "./pendingQuestionRetry";

type ExamPlan = {
  title: string;
  instructions: string;
  durationMinutes: number;
  totalScoreCentiPoints: number;
};

/** Tóm tắt 1 câu cho sidebar "Cấu trúc đề" — cập nhật theo từng sự kiện, khác node trong editor. */
export type QuestionSummary = {
  order: number;
  type: PracticeQuestionType;
  scoreCentiPoints: number;
  status: "pending" | "ready" | "failed";
};

/** Thay block (node `pendingQuestion` theo `order`) trong editor bằng HTML thật. */
function replacePendingQuestionBlock(editor: Editor, order: number, html: string) {
  let target: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target) return false;
    if (node.type.name === "pendingQuestion" && Number(node.attrs.order) === order) {
      target = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  if (!target) {
    console.warn("[exam-edit] Không tìm thấy block đang soạn cho câu", order);
    return;
  }
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta(PE_STREAM_META, true);
      return true;
    })
    .insertContentAt(target, html, { parseOptions: { preserveWhitespace: false } })
    .run();
}

/** Đổi trạng thái block `pendingQuestion` theo `order` (giữ nguyên node → CÒN mỏ neo `order`). */
function setPendingQuestionStatus(editor: Editor, order: number, status: PendingQuestionStatus, reason = "") {
  type Found = { pos: number; attrs: Record<string, unknown> };
  let target: Found | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target) return false;
    if (node.type.name === "pendingQuestion" && Number(node.attrs.order) === order) {
      target = { pos, attrs: node.attrs };
      return false;
    }
    return true;
  });
  const found = target as Found | null;
  if (!found) {
    console.warn("[exam-edit] Không tìm thấy block đang soạn để đổi trạng thái cho câu", order);
    return;
  }
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta(PE_STREAM_META, true);
      tr.setNodeMarkup(found.pos, undefined, { ...found.attrs, status, reason });
      return true;
    })
    .run();
}

/** Thay node `pendingSection` (placeholder Phần II) bằng đáp án thật — chỉ 1 node trong tài liệu. */
function replaceAnswersPlaceholder(editor: Editor, html: string) {
  let target: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target) return false;
    if (node.type.name === "pendingSection") {
      target = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  if (!target) return;
  editor
    .chain()
    .command(({ tr }) => {
      tr.setMeta(PE_STREAM_META, true);
      return true;
    })
    .insertContentAt(target, html, { parseOptions: { preserveWhitespace: false } })
    .run();
}

/**
 * Hook mở STOMP cho phiên sinh đề kiểm tra (đọc sessionId từ sessionStorage) và FILL DẦN vào
 * editor: PLAN_READY đổ khung (mỗi câu là 1 block "đang soạn"), mỗi BATCH_READY thay NHIỀU
 * block cùng lúc (khác lesson plan luôn 1 activity/event — 1 batch đề có thể gồm nhiều câu),
 * BATCH_FAILED đánh dấu lỗi cho các order trong batch đó. Không có phiên → giữ khung mặc định.
 */
export function usePracticeExamStream(
  editor: Editor | null,
  onComplete?: (exam: PracticeExam) => void,
  enabled = true,
): { questionSummaries: QuestionSummary[] } {
  const { accessToken, status } = useAuth();
  const [questionSummaries, setQuestionSummaries] = useState<QuestionSummary[]>([]);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const accessTokenRef = useRef(accessToken);
  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);
  // Ngữ cảnh giữ lại để retry sinh lại đúng 1 câu mà không mất phạm vi đề.
  const sessionRef = useRef<PracticeExamSession | null>(null);
  const planRef = useRef<ExamPlan | null>(null);
  const questionsRef = useRef<Map<number, PracticeExam["questions"][number]>>(new Map());
  const stubsRef = useRef<Map<number, PracticeExamQuestionStub>>(new Map());
  const inFlightRef = useRef<Set<number>>(new Set());
  // Đánh dấu đã nhận PLAN_READY — dùng để quyết định có nên ghi đè toàn bộ tài liệu bằng
  // thông báo lỗi hay không (khung về rồi thì giữ nguyên phần đã render).
  const planReceivedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !editor || startedRef.current) return;

    // Đợi AuthProvider hoàn tất refresh phiên. STOMP bắt buộc có JWT nên không được
    // mở socket trong lúc token còn null.
    if (status === "loading") return;

    if (status !== "authenticated" || !accessToken) {
      console.error("[exam-edit] Không thể mở stream: chưa đăng nhập.");
      return;
    }

    const session = readPracticeExamSession();
    if (!session) {
      console.log("[exam-edit] Không có phiên streaming — giữ khung mặc định.");
      return;
    }
    startedRef.current = true;
    // Tiêu thụ phiên ngay để reload trang không mở lại stream (đã/đang chạy).
    clearPracticeExamSession();
    sessionRef.current = session;

    console.log("%c[exam-edit] Mở stream đề kiểm tra", "color:#1565c0;font-weight:bold", session);

    let cancelled = false;

    const showErrorFallback = (message?: string) => {
      if (planReceivedRef.current || editor.isDestroyed) return;
      editor.setEditable(true);
      editor.commands.setContent(examErrorHtml(session.display, message));
    };

    const { disconnect } = connectPracticeExamStream({
      topic: practiceExamTopic(session.sessionId),
      accessToken,
      onEvent: (event) => {
        switch (event.type) {
          case "PLAN_READY": {
            planReceivedRef.current = true;
            planRef.current = {
              title: event.title,
              instructions: event.instructions,
              durationMinutes: event.durationMinutes,
              totalScoreCentiPoints: event.totalScoreCentiPoints,
            };
            stubsRef.current = new Map(event.stubs.map((stub) => [stub.order, stub]));
            console.log("%c← PLAN_READY", "color:#1565c0;font-weight:bold", event.stubs);
            editor.commands.setContent(examSkeletonHtml(event.title, event.instructions, event.stubs));
            editor.setEditable(true);
            setQuestionSummaries(
              event.stubs
                .map((stub) => ({ order: stub.order, type: stub.type, scoreCentiPoints: stub.scoreCentiPoints, status: "pending" as const }))
                .sort((a, b) => a.order - b.order),
            );
            break;
          }
          case "BATCH_READY": {
            console.log("%c← BATCH_READY", "color:#2e7d32;font-weight:bold", event.questions);
            const readyOrders = new Set(event.questions.map((question) => question.order));
            for (const question of event.questions) {
              questionsRef.current.set(question.order, question);
              replacePendingQuestionBlock(editor, question.order, questionContentHtml(question));
            }
            setQuestionSummaries((current) =>
              current.map((item) => (readyOrders.has(item.order) ? { ...item, status: "ready" } : item)),
            );
            break;
          }
          case "BATCH_FAILED": {
            console.warn("← BATCH_FAILED", event.orders, event.reason);
            const failedOrders = new Set(event.orders);
            for (const order of event.orders) {
              setPendingQuestionStatus(editor, order, "failed", event.reason);
            }
            setQuestionSummaries((current) =>
              current.map((item) => (failedOrders.has(item.order) ? { ...item, status: "failed" } : item)),
            );
            break;
          }
          case "DONE": {
            console.log("%c← DONE — đề đã sinh xong", "color:#2e7d32;font-weight:bold");
            const plan = planRef.current;
            if (plan) {
              const questions = [...questionsRef.current.values()].sort((a, b) => a.order - b.order);
              replaceAnswersPlaceholder(editor, answersSectionHtml(questions));
              onCompleteRef.current?.({
                title: plan.title,
                instructions: plan.instructions,
                durationMinutes: plan.durationMinutes,
                totalScoreCentiPoints: plan.totalScoreCentiPoints,
                questions,
              });
            }
            break;
          }
          case "ERROR": {
            console.error("← ERROR khi sinh đề:", event.message);
            showErrorFallback(event.message);
            break;
          }
        }
      },
      onClose: () => {
        console.log("[exam-edit] stream đóng.");
        if (!cancelled) showErrorFallback();
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
      const session = sessionRef.current;
      const stub = stubsRef.current.get(order);
      const token = accessTokenRef.current;
      if (!session || !stub || !token) {
        console.warn("[exam-edit] Thiếu ngữ cảnh để thử lại câu", order);
        return;
      }
      if (inFlightRef.current.has(order)) return;
      inFlightRef.current.add(order);
      setPendingQuestionStatus(editor, order, "pending");
      setQuestionSummaries((current) => current.map((item) => (item.order === order ? { ...item, status: "pending" } : item)));
      try {
        const question = await regenerateQuestion(
          { request: session.request, order, type: stub.type, scoreCentiPoints: stub.scoreCentiPoints },
          token,
        );
        if (editor.isDestroyed) return;
        console.log(`%c↻ RETRY OK câu ${order}`, "color:#2e7d32;font-weight:bold");
        questionsRef.current.set(order, question);
        replacePendingQuestionBlock(editor, order, questionContentHtml(question));
        setQuestionSummaries((current) => current.map((item) => (item.order === order ? { ...item, status: "ready" } : item)));
      } catch (error) {
        if (editor.isDestroyed) return;
        const message = error instanceof Error ? error.message : "Sinh lại câu hỏi thất bại.";
        console.warn(`↻ RETRY FAILED câu ${order}:`, message);
        setPendingQuestionStatus(editor, order, "failed", message);
        setQuestionSummaries((current) => current.map((item) => (item.order === order ? { ...item, status: "failed" } : item)));
      } finally {
        inFlightRef.current.delete(order);
      }
    };

    setQuestionRetryHandler(editor, (order) => {
      void handleRetry(order);
    });
    return () => {
      setQuestionRetryHandler(editor, null);
    };
  }, [editor]);

  return { questionSummaries };
}
