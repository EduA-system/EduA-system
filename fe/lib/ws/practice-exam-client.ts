import { Client } from "@stomp/stompjs";
import { BACKEND_WS_URL } from "@/lib/backend-url";
import type { PracticeExam } from "@/services/practiceExamService";

/** Câu hỏi dự kiến (order/loại/điểm) — chưa có nội dung, dùng dựng khung "đang soạn". */
export type PracticeExamQuestionStub = {
  order: number;
  type: PracticeExam["questions"][number]["type"];
  scoreCentiPoints: number;
};

// Sự kiện streaming sinh đề kiểm tra, khớp `PracticeExamEvent` ở BE
// (sealed interface, discriminator field `type`). Topic: /topic/practice-exam/{sessionId}.
// Khác lesson plan: BATCH_READY/BATCH_FAILED mang NHIỀU câu/order mỗi sự kiện.
export type PracticeExamStreamEvent =
  | {
      type: "PLAN_READY";
      sessionId: string;
      title: string;
      instructions: string;
      durationMinutes: number;
      totalScoreCentiPoints: number;
      stubs: PracticeExamQuestionStub[];
    }
  | { type: "BATCH_READY"; sessionId: string; questions: PracticeExam["questions"] }
  | { type: "BATCH_FAILED"; sessionId: string; orders: number[]; reason: string }
  | { type: "DONE"; sessionId: string }
  | { type: "ERROR"; sessionId: string; message: string };

/**
 * Mở STOMP subscription cho một phiên sinh đề kiểm tra. Nối thẳng BE
 * (KHÔNG qua proxy Next.js — né timeout). Tự `onClose` khi nhận DONE/ERROR.
 */
export function connectPracticeExamStream({
  topic,
  accessToken,
  onEvent,
  onClose,
}: {
  topic: string;
  accessToken: string;
  onEvent: (event: PracticeExamStreamEvent) => void;
  onClose: () => void;
}): { disconnect: () => void } {
  const brokerURL = `${BACKEND_WS_URL}/ws`;
  console.log("[practice-exam WS] connecting", { brokerURL, topic });

  const client = new Client({
    brokerURL,
    connectHeaders: { Authorization: `Bearer ${accessToken}` },
    reconnectDelay: 2000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      console.log("[practice-exam WS] connected, subscribing", { topic });
      client.subscribe(topic, (message) => {
        try {
          const payload = JSON.parse(message.body) as PracticeExamStreamEvent;
          onEvent(payload);
          if (payload.type === "DONE" || payload.type === "ERROR") {
            console.log("[practice-exam WS] stream finished", { type: payload.type });
            onClose();
          }
        } catch (error) {
          console.error("[practice-exam WS] malformed frame", message.body, error);
        }
      });
    },
    onDisconnect: () => {
      console.log("[practice-exam WS] disconnected", { topic });
      onClose();
    },
    onStompError: (frame) => {
      console.error("[practice-exam WS] STOMP error", frame.headers, frame.body);
      onClose();
    },
    onWebSocketClose: (event) => {
      console.log("[practice-exam WS] websocket closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
    },
  });
  client.activate();
  return {
    disconnect: () => {
      console.log("[practice-exam WS] disconnect requested", { topic });
      void client.deactivate();
    },
  };
}

/** Topic STOMP cho một phiên đề kiểm tra. */
export function practiceExamTopic(sessionId: string): string {
  return `/topic/practice-exam/${sessionId}`;
}
